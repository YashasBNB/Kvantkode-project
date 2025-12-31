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
var ContentHoverWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ResizableContentWidget } from './resizableContentWidget.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { getHoverAccessibleViewHint, HoverWidget, } from '../../../../base/browser/ui/hover/hoverWidget.js';
import { Emitter } from '../../../../base/common/event.js';
const HORIZONTAL_SCROLLING_BY = 30;
let ContentHoverWidget = class ContentHoverWidget extends ResizableContentWidget {
    static { ContentHoverWidget_1 = this; }
    static { this.ID = 'editor.contrib.resizableContentHoverWidget'; }
    static { this._lastDimensions = new dom.Dimension(0, 0); }
    get isVisibleFromKeyboard() {
        return this._renderedHover?.source === 2 /* HoverStartSource.Keyboard */;
    }
    get isVisible() {
        return this._hoverVisibleKey.get() ?? false;
    }
    get isFocused() {
        return this._hoverFocusedKey.get() ?? false;
    }
    constructor(editor, contextKeyService, _configurationService, _accessibilityService, _keybindingService) {
        const minimumHeight = editor.getOption(68 /* EditorOption.lineHeight */) + 8;
        const minimumWidth = 150;
        const minimumSize = new dom.Dimension(minimumWidth, minimumHeight);
        super(editor, minimumSize);
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._keybindingService = _keybindingService;
        this._hover = this._register(new HoverWidget(true));
        this._onDidResize = this._register(new Emitter());
        this.onDidResize = this._onDidResize.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._minimumSize = minimumSize;
        this._hoverVisibleKey = EditorContextKeys.hoverVisible.bindTo(contextKeyService);
        this._hoverFocusedKey = EditorContextKeys.hoverFocused.bindTo(contextKeyService);
        dom.append(this._resizableNode.domNode, this._hover.containerDomNode);
        this._resizableNode.domNode.style.zIndex = '50';
        this._resizableNode.domNode.className = 'monaco-resizable-hover';
        this._register(this._editor.onDidLayoutChange(() => {
            if (this.isVisible) {
                this._updateMaxDimensions();
            }
        }));
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this._updateFont();
            }
        }));
        const focusTracker = this._register(dom.trackFocus(this._resizableNode.domNode));
        this._register(focusTracker.onDidFocus(() => {
            this._hoverFocusedKey.set(true);
        }));
        this._register(focusTracker.onDidBlur(() => {
            this._hoverFocusedKey.set(false);
        }));
        this._register(this._hover.scrollbar.onScroll((e) => {
            this._onDidScroll.fire(e);
        }));
        this._setRenderedHover(undefined);
        this._editor.addContentWidget(this);
    }
    dispose() {
        super.dispose();
        this._renderedHover?.dispose();
        this._editor.removeContentWidget(this);
    }
    getId() {
        return ContentHoverWidget_1.ID;
    }
    static _applyDimensions(container, width, height) {
        const transformedWidth = typeof width === 'number' ? `${width}px` : width;
        const transformedHeight = typeof height === 'number' ? `${height}px` : height;
        container.style.width = transformedWidth;
        container.style.height = transformedHeight;
    }
    _setContentsDomNodeDimensions(width, height) {
        const contentsDomNode = this._hover.contentsDomNode;
        return ContentHoverWidget_1._applyDimensions(contentsDomNode, width, height);
    }
    _setContainerDomNodeDimensions(width, height) {
        const containerDomNode = this._hover.containerDomNode;
        return ContentHoverWidget_1._applyDimensions(containerDomNode, width, height);
    }
    _setScrollableElementDimensions(width, height) {
        const scrollbarDomElement = this._hover.scrollbar.getDomNode();
        return ContentHoverWidget_1._applyDimensions(scrollbarDomElement, width, height);
    }
    _setHoverWidgetDimensions(width, height) {
        this._setContainerDomNodeDimensions(width, height);
        this._setScrollableElementDimensions(width, height);
        this._setContentsDomNodeDimensions(width, height);
        this._layoutContentWidget();
    }
    static _applyMaxDimensions(container, width, height) {
        const transformedWidth = typeof width === 'number' ? `${width}px` : width;
        const transformedHeight = typeof height === 'number' ? `${height}px` : height;
        container.style.maxWidth = transformedWidth;
        container.style.maxHeight = transformedHeight;
    }
    _setHoverWidgetMaxDimensions(width, height) {
        ContentHoverWidget_1._applyMaxDimensions(this._hover.contentsDomNode, width, height);
        ContentHoverWidget_1._applyMaxDimensions(this._hover.scrollbar.getDomNode(), width, height);
        ContentHoverWidget_1._applyMaxDimensions(this._hover.containerDomNode, width, height);
        this._hover.containerDomNode.style.setProperty('--vscode-hover-maxWidth', typeof width === 'number' ? `${width}px` : width);
        this._layoutContentWidget();
    }
    _setAdjustedHoverWidgetDimensions(size) {
        this._setHoverWidgetMaxDimensions('none', 'none');
        this._setHoverWidgetDimensions(size.width, size.height);
    }
    _updateResizableNodeMaxDimensions() {
        const maxRenderingWidth = this._findMaximumRenderingWidth() ?? Infinity;
        const maxRenderingHeight = this._findMaximumRenderingHeight() ?? Infinity;
        this._resizableNode.maxSize = new dom.Dimension(maxRenderingWidth, maxRenderingHeight);
        this._setHoverWidgetMaxDimensions(maxRenderingWidth, maxRenderingHeight);
    }
    _resize(size) {
        ContentHoverWidget_1._lastDimensions = new dom.Dimension(size.width, size.height);
        this._setAdjustedHoverWidgetDimensions(size);
        this._resizableNode.layout(size.height, size.width);
        this._updateResizableNodeMaxDimensions();
        this._hover.scrollbar.scanDomNode();
        this._editor.layoutContentWidget(this);
        this._onDidResize.fire();
    }
    _findAvailableSpaceVertically() {
        const position = this._renderedHover?.showAtPosition;
        if (!position) {
            return;
        }
        return this._positionPreference === 1 /* ContentWidgetPositionPreference.ABOVE */
            ? this._availableVerticalSpaceAbove(position)
            : this._availableVerticalSpaceBelow(position);
    }
    _findMaximumRenderingHeight() {
        const availableSpace = this._findAvailableSpaceVertically();
        if (!availableSpace) {
            return;
        }
        const children = this._hover.contentsDomNode.children;
        let maximumHeight = children.length - 1;
        Array.from(this._hover.contentsDomNode.children).forEach((hoverPart) => {
            maximumHeight += hoverPart.clientHeight;
        });
        return Math.min(availableSpace, maximumHeight);
    }
    _isHoverTextOverflowing() {
        // To find out if the text is overflowing, we will disable wrapping, check the widths, and then re-enable wrapping
        this._hover.containerDomNode.style.setProperty('--vscode-hover-whiteSpace', 'nowrap');
        this._hover.containerDomNode.style.setProperty('--vscode-hover-sourceWhiteSpace', 'nowrap');
        const overflowing = Array.from(this._hover.contentsDomNode.children).some((hoverElement) => {
            return hoverElement.scrollWidth > hoverElement.clientWidth;
        });
        this._hover.containerDomNode.style.removeProperty('--vscode-hover-whiteSpace');
        this._hover.containerDomNode.style.removeProperty('--vscode-hover-sourceWhiteSpace');
        return overflowing;
    }
    _findMaximumRenderingWidth() {
        if (!this._editor || !this._editor.hasModel()) {
            return;
        }
        const overflowing = this._isHoverTextOverflowing();
        const initialWidth = typeof this._contentWidth === 'undefined' ? 0 : this._contentWidth;
        if (overflowing || this._hover.containerDomNode.clientWidth < initialWidth) {
            const bodyBoxWidth = dom.getClientArea(this._hover.containerDomNode.ownerDocument.body).width;
            const horizontalPadding = 14;
            return bodyBoxWidth - horizontalPadding;
        }
        else {
            return this._hover.containerDomNode.clientWidth;
        }
    }
    isMouseGettingCloser(posx, posy) {
        if (!this._renderedHover) {
            return false;
        }
        if (this._renderedHover.initialMousePosX === undefined ||
            this._renderedHover.initialMousePosY === undefined) {
            this._renderedHover.initialMousePosX = posx;
            this._renderedHover.initialMousePosY = posy;
            return false;
        }
        const widgetRect = dom.getDomNodePagePosition(this.getDomNode());
        if (this._renderedHover.closestMouseDistance === undefined) {
            this._renderedHover.closestMouseDistance = computeDistanceFromPointToRectangle(this._renderedHover.initialMousePosX, this._renderedHover.initialMousePosY, widgetRect.left, widgetRect.top, widgetRect.width, widgetRect.height);
        }
        const distance = computeDistanceFromPointToRectangle(posx, posy, widgetRect.left, widgetRect.top, widgetRect.width, widgetRect.height);
        if (distance > this._renderedHover.closestMouseDistance + 4 /* tolerance of 4 pixels */) {
            // The mouse is getting farther away
            return false;
        }
        this._renderedHover.closestMouseDistance = Math.min(this._renderedHover.closestMouseDistance, distance);
        return true;
    }
    _setRenderedHover(renderedHover) {
        this._renderedHover?.dispose();
        this._renderedHover = renderedHover;
        this._hoverVisibleKey.set(!!renderedHover);
        this._hover.containerDomNode.classList.toggle('hidden', !renderedHover);
    }
    _updateFont() {
        const { fontSize, lineHeight } = this._editor.getOption(52 /* EditorOption.fontInfo */);
        const contentsDomNode = this._hover.contentsDomNode;
        contentsDomNode.style.fontSize = `${fontSize}px`;
        contentsDomNode.style.lineHeight = `${lineHeight / fontSize}`;
        const codeClasses = Array.prototype.slice.call(this._hover.contentsDomNode.getElementsByClassName('code'));
        codeClasses.forEach((node) => this._editor.applyFontInfo(node));
    }
    _updateContent(node) {
        const contentsDomNode = this._hover.contentsDomNode;
        contentsDomNode.style.paddingBottom = '';
        contentsDomNode.textContent = '';
        contentsDomNode.appendChild(node);
    }
    _layoutContentWidget() {
        this._editor.layoutContentWidget(this);
        this._hover.onContentsChanged();
    }
    _updateMaxDimensions() {
        const height = Math.max(this._editor.getLayoutInfo().height / 4, 250, ContentHoverWidget_1._lastDimensions.height);
        const width = Math.max(this._editor.getLayoutInfo().width * 0.66, 750, ContentHoverWidget_1._lastDimensions.width);
        this._resizableNode.maxSize = new dom.Dimension(width, height);
        this._setHoverWidgetMaxDimensions(width, height);
    }
    _render(renderedHover) {
        this._setRenderedHover(renderedHover);
        this._updateFont();
        this._updateContent(renderedHover.domNode);
        this.onContentsChanged();
        // Simply force a synchronous render on the editor
        // such that the widget does not really render with left = '0px'
        this._editor.render();
    }
    getPosition() {
        if (!this._renderedHover) {
            return null;
        }
        return {
            position: this._renderedHover.showAtPosition,
            secondaryPosition: this._renderedHover.showAtSecondaryPosition,
            positionAffinity: this._renderedHover.shouldAppearBeforeContent
                ? 3 /* PositionAffinity.LeftOfInjectedText */
                : undefined,
            preference: [this._positionPreference ?? 1 /* ContentWidgetPositionPreference.ABOVE */],
        };
    }
    show(renderedHover) {
        if (!this._editor || !this._editor.hasModel()) {
            return;
        }
        this._render(renderedHover);
        const widgetHeight = dom.getTotalHeight(this._hover.containerDomNode);
        const widgetPosition = renderedHover.showAtPosition;
        this._positionPreference =
            this._findPositionPreference(widgetHeight, widgetPosition) ??
                1 /* ContentWidgetPositionPreference.ABOVE */;
        // See https://github.com/microsoft/vscode/issues/140339
        // TODO: Doing a second layout of the hover after force rendering the editor
        this.onContentsChanged();
        if (renderedHover.shouldFocus) {
            this._hover.containerDomNode.focus();
        }
        this._onDidResize.fire();
        // The aria label overrides the label, so if we add to it, add the contents of the hover
        const hoverFocused = this._hover.containerDomNode.ownerDocument.activeElement === this._hover.containerDomNode;
        const accessibleViewHint = hoverFocused &&
            getHoverAccessibleViewHint(this._configurationService.getValue('accessibility.verbosity.hover') === true &&
                this._accessibilityService.isScreenReaderOptimized(), this._keybindingService.lookupKeybinding('editor.action.accessibleView')?.getAriaLabel() ??
                '');
        if (accessibleViewHint) {
            this._hover.contentsDomNode.ariaLabel =
                this._hover.contentsDomNode.textContent + ', ' + accessibleViewHint;
        }
    }
    hide() {
        if (!this._renderedHover) {
            return;
        }
        const hoverStoleFocus = this._renderedHover.shouldFocus || this._hoverFocusedKey.get();
        this._setRenderedHover(undefined);
        this._resizableNode.maxSize = new dom.Dimension(Infinity, Infinity);
        this._resizableNode.clearSashHoverState();
        this._hoverFocusedKey.set(false);
        this._editor.layoutContentWidget(this);
        if (hoverStoleFocus) {
            this._editor.focus();
        }
    }
    _removeConstraintsRenderNormally() {
        // Added because otherwise the initial size of the hover content is smaller than should be
        const layoutInfo = this._editor.getLayoutInfo();
        this._resizableNode.layout(layoutInfo.height, layoutInfo.width);
        this._setHoverWidgetDimensions('auto', 'auto');
        this._updateMaxDimensions();
    }
    setMinimumDimensions(dimensions) {
        // We combine the new minimum dimensions with the previous ones
        this._minimumSize = new dom.Dimension(Math.max(this._minimumSize.width, dimensions.width), Math.max(this._minimumSize.height, dimensions.height));
        this._updateMinimumWidth();
    }
    _updateMinimumWidth() {
        const width = typeof this._contentWidth === 'undefined'
            ? this._minimumSize.width
            : Math.min(this._contentWidth, this._minimumSize.width);
        // We want to avoid that the hover is artificially large, so we use the content width as minimum width
        this._resizableNode.minSize = new dom.Dimension(width, this._minimumSize.height);
    }
    onContentsChanged() {
        this._removeConstraintsRenderNormally();
        const contentsDomNode = this._hover.contentsDomNode;
        let height = dom.getTotalHeight(contentsDomNode);
        let width = dom.getTotalWidth(contentsDomNode) + 2;
        this._resizableNode.layout(height, width);
        this._setHoverWidgetDimensions(width, height);
        height = dom.getTotalHeight(contentsDomNode);
        width = dom.getTotalWidth(contentsDomNode);
        this._contentWidth = width;
        this._updateMinimumWidth();
        this._resizableNode.layout(height, width);
        if (this._renderedHover?.showAtPosition) {
            const widgetHeight = dom.getTotalHeight(this._hover.containerDomNode);
            this._positionPreference = this._findPositionPreference(widgetHeight, this._renderedHover.showAtPosition);
        }
        this._layoutContentWidget();
    }
    focus() {
        this._hover.containerDomNode.focus();
    }
    scrollUp() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const fontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop - fontInfo.lineHeight });
    }
    scrollDown() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const fontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop + fontInfo.lineHeight });
    }
    scrollLeft() {
        const scrollLeft = this._hover.scrollbar.getScrollPosition().scrollLeft;
        this._hover.scrollbar.setScrollPosition({ scrollLeft: scrollLeft - HORIZONTAL_SCROLLING_BY });
    }
    scrollRight() {
        const scrollLeft = this._hover.scrollbar.getScrollPosition().scrollLeft;
        this._hover.scrollbar.setScrollPosition({ scrollLeft: scrollLeft + HORIZONTAL_SCROLLING_BY });
    }
    pageUp() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const scrollHeight = this._hover.scrollbar.getScrollDimensions().height;
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop - scrollHeight });
    }
    pageDown() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const scrollHeight = this._hover.scrollbar.getScrollDimensions().height;
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop + scrollHeight });
    }
    goToTop() {
        this._hover.scrollbar.setScrollPosition({ scrollTop: 0 });
    }
    goToBottom() {
        this._hover.scrollbar.setScrollPosition({
            scrollTop: this._hover.scrollbar.getScrollDimensions().scrollHeight,
        });
    }
};
ContentHoverWidget = ContentHoverWidget_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, IAccessibilityService),
    __param(4, IKeybindingService)
], ContentHoverWidget);
export { ContentHoverWidget };
function computeDistanceFromPointToRectangle(pointX, pointY, left, top, width, height) {
    const x = left + width / 2; // x center of rectangle
    const y = top + height / 2; // y center of rectangle
    const dx = Math.max(Math.abs(pointX - x) - width / 2, 0);
    const dy = Math.max(Math.abs(pointY - y) - height / 2, 0);
    return Math.sqrt(dx * dx + dy * dy);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9jb250ZW50SG92ZXJXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFRdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsV0FBVyxHQUNYLE1BQU0sa0RBQWtELENBQUE7QUFFekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBSTFELE1BQU0sdUJBQXVCLEdBQUcsRUFBRSxDQUFBO0FBRTNCLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsc0JBQXNCOzthQUMvQyxPQUFFLEdBQUcsNENBQTRDLEFBQS9DLENBQStDO2FBQ2hELG9CQUFlLEdBQWtCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEFBQXpDLENBQXlDO0lBaUJ2RSxJQUFXLHFCQUFxQjtRQUMvQixPQUFPLElBQUksQ0FBQyxjQUFjLEVBQUUsTUFBTSxzQ0FBOEIsQ0FBQTtJQUNqRSxDQUFDO0lB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