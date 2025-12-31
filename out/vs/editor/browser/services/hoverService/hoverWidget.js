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
import './hover.css';
import { DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import * as dom from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EDITOR_FONT_DEFAULTS } from '../../../common/config/editorOptions.js';
import { HoverAction, HoverWidget as BaseHoverWidget, getHoverAccessibleViewHint, } from '../../../../base/browser/ui/hover/hoverWidget.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MarkdownRenderer, openLinkFromMarkdown, } from '../../widget/markdownRenderer/browser/markdownRenderer.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
import { localize } from '../../../../nls.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { TimeoutTimer } from '../../../../base/common/async.js';
import { isNumber } from '../../../../base/common/types.js';
const $ = dom.$;
var Constants;
(function (Constants) {
    Constants[Constants["PointerSize"] = 3] = "PointerSize";
    Constants[Constants["HoverBorderWidth"] = 2] = "HoverBorderWidth";
    Constants[Constants["HoverWindowEdgeMargin"] = 2] = "HoverWindowEdgeMargin";
})(Constants || (Constants = {}));
let HoverWidget = class HoverWidget extends Widget {
    get _targetWindow() {
        return dom.getWindow(this._target.targetElements[0]);
    }
    get _targetDocumentElement() {
        return dom.getWindow(this._target.targetElements[0]).document.documentElement;
    }
    get isDisposed() {
        return this._isDisposed;
    }
    get isMouseIn() {
        return this._lockMouseTracker.isMouseIn;
    }
    get domNode() {
        return this._hover.containerDomNode;
    }
    get onDispose() {
        return this._onDispose.event;
    }
    get onRequestLayout() {
        return this._onRequestLayout.event;
    }
    get anchor() {
        return this._hoverPosition === 2 /* HoverPosition.BELOW */ ? 0 /* AnchorPosition.BELOW */ : 1 /* AnchorPosition.ABOVE */;
    }
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    /**
     * Whether the hover is "locked" by holding the alt/option key. When locked, the hover will not
     * hide and can be hovered regardless of whether the `hideOnHover` hover option is set.
     */
    get isLocked() {
        return this._isLocked;
    }
    set isLocked(value) {
        if (this._isLocked === value) {
            return;
        }
        this._isLocked = value;
        this._hoverContainer.classList.toggle('locked', this._isLocked);
    }
    constructor(options, _keybindingService, _configurationService, _openerService, _instantiationService, _accessibilityService) {
        super();
        this._keybindingService = _keybindingService;
        this._configurationService = _configurationService;
        this._openerService = _openerService;
        this._instantiationService = _instantiationService;
        this._accessibilityService = _accessibilityService;
        this._messageListeners = new DisposableStore();
        this._isDisposed = false;
        this._forcePosition = false;
        this._x = 0;
        this._y = 0;
        this._isLocked = false;
        this._enableFocusTraps = false;
        this._addedFocusTrap = false;
        this._onDispose = this._register(new Emitter());
        this._onRequestLayout = this._register(new Emitter());
        this._linkHandler =
            options.linkHandler ||
                ((url) => {
                    return openLinkFromMarkdown(this._openerService, url, isMarkdownString(options.content) ? options.content.isTrusted : undefined);
                });
        this._target =
            'targetElements' in options.target ? options.target : new ElementHoverTarget(options.target);
        this._hoverPointer = options.appearance?.showPointer
            ? $('div.workbench-hover-pointer')
            : undefined;
        this._hover = this._register(new BaseHoverWidget(!options.appearance?.skipFadeInAnimation));
        this._hover.containerDomNode.classList.add('workbench-hover');
        if (options.appearance?.compact) {
            this._hover.containerDomNode.classList.add('workbench-hover', 'compact');
        }
        if (options.additionalClasses) {
            this._hover.containerDomNode.classList.add(...options.additionalClasses);
        }
        if (options.position?.forcePosition) {
            this._forcePosition = true;
        }
        if (options.trapFocus) {
            this._enableFocusTraps = true;
        }
        // Default to position above when the position is unspecified or a mouse event
        this._hoverPosition =
            options.position?.hoverPosition === undefined
                ? 3 /* HoverPosition.ABOVE */
                : isNumber(options.position.hoverPosition)
                    ? options.position.hoverPosition
                    : 2 /* HoverPosition.BELOW */;
        // Don't allow mousedown out of the widget, otherwise preventDefault will call and text will
        // not be selected.
        this.onmousedown(this._hover.containerDomNode, (e) => e.stopPropagation());
        // Hide hover on escape
        this.onkeydown(this._hover.containerDomNode, (e) => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.dispose();
            }
        });
        // Hide when the window loses focus
        this._register(dom.addDisposableListener(this._targetWindow, 'blur', () => this.dispose()));
        const rowElement = $('div.hover-row.markdown-hover');
        const contentsElement = $('div.hover-contents');
        if (typeof options.content === 'string') {
            contentsElement.textContent = options.content;
            contentsElement.style.whiteSpace = 'pre-wrap';
        }
        else if (dom.isHTMLElement(options.content)) {
            contentsElement.appendChild(options.content);
            contentsElement.classList.add('html-hover-contents');
        }
        else {
            const markdown = options.content;
            const mdRenderer = this._instantiationService.createInstance(MarkdownRenderer, {
                codeBlockFontFamily: this._configurationService.getValue('editor').fontFamily ||
                    EDITOR_FONT_DEFAULTS.fontFamily,
            });
            const { element, dispose } = mdRenderer.render(markdown, {
                actionHandler: {
                    callback: (content) => this._linkHandler(content),
                    disposables: this._messageListeners,
                },
                asyncRenderCallback: () => {
                    contentsElement.classList.add('code-hover-contents');
                    this.layout();
                    // This changes the dimensions of the hover so trigger a layout
                    this._onRequestLayout.fire();
                },
            });
            contentsElement.appendChild(element);
            this._register(toDisposable(dispose));
        }
        rowElement.appendChild(contentsElement);
        this._hover.contentsDomNode.appendChild(rowElement);
        if (options.actions && options.actions.length > 0) {
            const statusBarElement = $('div.hover-row.status-bar');
            const actionsElement = $('div.actions');
            options.actions.forEach((action) => {
                const keybinding = this._keybindingService.lookupKeybinding(action.commandId);
                const keybindingLabel = keybinding ? keybinding.getLabel() : null;
                this._register(HoverAction.render(actionsElement, {
                    label: action.label,
                    commandId: action.commandId,
                    run: (e) => {
                        action.run(e);
                        this.dispose();
                    },
                    iconClass: action.iconClass,
                }, keybindingLabel));
            });
            statusBarElement.appendChild(actionsElement);
            this._hover.containerDomNode.appendChild(statusBarElement);
        }
        this._hoverContainer = $('div.workbench-hover-container');
        if (this._hoverPointer) {
            this._hoverContainer.appendChild(this._hoverPointer);
        }
        this._hoverContainer.appendChild(this._hover.containerDomNode);
        // Determine whether to hide on hover
        let hideOnHover;
        if (options.actions && options.actions.length > 0) {
            // If there are actions, require hover so they can be accessed
            hideOnHover = false;
        }
        else {
            if (options.persistence?.hideOnHover === undefined) {
                // When unset, will default to true when it's a string or when it's markdown that
                // appears to have a link using a naive check for '](' and '</a>'
                hideOnHover =
                    typeof options.content === 'string' ||
                        (isMarkdownString(options.content) &&
                            !options.content.value.includes('](') &&
                            !options.content.value.includes('</a>'));
            }
            else {
                // It's set explicitly
                hideOnHover = options.persistence.hideOnHover;
            }
        }
        // Show the hover hint if needed
        if (options.appearance?.showHoverHint) {
            const statusBarElement = $('div.hover-row.status-bar');
            const infoElement = $('div.info');
            infoElement.textContent = localize('hoverhint', 'Hold {0} key to mouse over', isMacintosh ? 'Option' : 'Alt');
            statusBarElement.appendChild(infoElement);
            this._hover.containerDomNode.appendChild(statusBarElement);
        }
        const mouseTrackerTargets = [...this._target.targetElements];
        if (!hideOnHover) {
            mouseTrackerTargets.push(this._hoverContainer);
        }
        const mouseTracker = this._register(new CompositeMouseTracker(mouseTrackerTargets));
        this._register(mouseTracker.onMouseOut(() => {
            if (!this._isLocked) {
                this.dispose();
            }
        }));
        // Setup another mouse tracker when hideOnHover is set in order to track the hover as well
        // when it is locked. This ensures the hover will hide on mouseout after alt has been
        // released to unlock the element.
        if (hideOnHover) {
            const mouseTracker2Targets = [...this._target.targetElements, this._hoverContainer];
            this._lockMouseTracker = this._register(new CompositeMouseTracker(mouseTracker2Targets));
            this._register(this._lockMouseTracker.onMouseOut(() => {
                if (!this._isLocked) {
                    this.dispose();
                }
            }));
        }
        else {
            this._lockMouseTracker = mouseTracker;
        }
    }
    addFocusTrap() {
        if (!this._enableFocusTraps || this._addedFocusTrap) {
            return;
        }
        this._addedFocusTrap = true;
        // Add a hover tab loop if the hover has at least one element with a valid tabIndex
        const firstContainerFocusElement = this._hover.containerDomNode;
        const lastContainerFocusElement = this.findLastFocusableChild(this._hover.containerDomNode);
        if (lastContainerFocusElement) {
            const beforeContainerFocusElement = dom.prepend(this._hoverContainer, $('div'));
            const afterContainerFocusElement = dom.append(this._hoverContainer, $('div'));
            beforeContainerFocusElement.tabIndex = 0;
            afterContainerFocusElement.tabIndex = 0;
            this._register(dom.addDisposableListener(afterContainerFocusElement, 'focus', (e) => {
                firstContainerFocusElement.focus();
                e.preventDefault();
            }));
            this._register(dom.addDisposableListener(beforeContainerFocusElement, 'focus', (e) => {
                lastContainerFocusElement.focus();
                e.preventDefault();
            }));
        }
    }
    findLastFocusableChild(root) {
        if (root.hasChildNodes()) {
            for (let i = 0; i < root.childNodes.length; i++) {
                const node = root.childNodes.item(root.childNodes.length - i - 1);
                if (node.nodeType === node.ELEMENT_NODE) {
                    const parsedNode = node;
                    if (typeof parsedNode.tabIndex === 'number' && parsedNode.tabIndex >= 0) {
                        return parsedNode;
                    }
                }
                const recursivelyFoundElement = this.findLastFocusableChild(node);
                if (recursivelyFoundElement) {
                    return recursivelyFoundElement;
                }
            }
        }
        return undefined;
    }
    render(container) {
        container.appendChild(this._hoverContainer);
        const hoverFocused = this._hoverContainer.contains(this._hoverContainer.ownerDocument.activeElement);
        const accessibleViewHint = hoverFocused &&
            getHoverAccessibleViewHint(this._configurationService.getValue('accessibility.verbosity.hover') === true &&
                this._accessibilityService.isScreenReaderOptimized(), this._keybindingService.lookupKeybinding('editor.action.accessibleView')?.getAriaLabel());
        if (accessibleViewHint) {
            status(accessibleViewHint);
        }
        this.layout();
        this.addFocusTrap();
    }
    layout() {
        this._hover.containerDomNode.classList.remove('right-aligned');
        this._hover.contentsDomNode.style.maxHeight = '';
        const getZoomAccountedBoundingClientRect = (e) => {
            const zoom = dom.getDomNodeZoomLevel(e);
            const boundingRect = e.getBoundingClientRect();
            return {
                top: boundingRect.top * zoom,
                bottom: boundingRect.bottom * zoom,
                right: boundingRect.right * zoom,
                left: boundingRect.left * zoom,
            };
        };
        const targetBounds = this._target.targetElements.map((e) => getZoomAccountedBoundingClientRect(e));
        const { top, right, bottom, left } = targetBounds[0];
        const width = right - left;
        const height = bottom - top;
        const targetRect = {
            top,
            right,
            bottom,
            left,
            width,
            height,
            center: {
                x: left + width / 2,
                y: top + height / 2,
            },
        };
        // These calls adjust the position depending on spacing.
        this.adjustHorizontalHoverPosition(targetRect);
        this.adjustVerticalHoverPosition(targetRect);
        // This call limits the maximum height of the hover.
        this.adjustHoverMaxHeight(targetRect);
        // Offset the hover position if there is a pointer so it aligns with the target element
        this._hoverContainer.style.padding = '';
        this._hoverContainer.style.margin = '';
        if (this._hoverPointer) {
            switch (this._hoverPosition) {
                case 1 /* HoverPosition.RIGHT */:
                    targetRect.left += 3 /* Constants.PointerSize */;
                    targetRect.right += 3 /* Constants.PointerSize */;
                    this._hoverContainer.style.paddingLeft = `${3 /* Constants.PointerSize */}px`;
                    this._hoverContainer.style.marginLeft = `${-3 /* Constants.PointerSize */}px`;
                    break;
                case 0 /* HoverPosition.LEFT */:
                    targetRect.left -= 3 /* Constants.PointerSize */;
                    targetRect.right -= 3 /* Constants.PointerSize */;
                    this._hoverContainer.style.paddingRight = `${3 /* Constants.PointerSize */}px`;
                    this._hoverContainer.style.marginRight = `${-3 /* Constants.PointerSize */}px`;
                    break;
                case 2 /* HoverPosition.BELOW */:
                    targetRect.top += 3 /* Constants.PointerSize */;
                    targetRect.bottom += 3 /* Constants.PointerSize */;
                    this._hoverContainer.style.paddingTop = `${3 /* Constants.PointerSize */}px`;
                    this._hoverContainer.style.marginTop = `${-3 /* Constants.PointerSize */}px`;
                    break;
                case 3 /* HoverPosition.ABOVE */:
                    targetRect.top -= 3 /* Constants.PointerSize */;
                    targetRect.bottom -= 3 /* Constants.PointerSize */;
                    this._hoverContainer.style.paddingBottom = `${3 /* Constants.PointerSize */}px`;
                    this._hoverContainer.style.marginBottom = `${-3 /* Constants.PointerSize */}px`;
                    break;
            }
            targetRect.center.x = targetRect.left + width / 2;
            targetRect.center.y = targetRect.top + height / 2;
        }
        this.computeXCordinate(targetRect);
        this.computeYCordinate(targetRect);
        if (this._hoverPointer) {
            // reset
            this._hoverPointer.classList.remove('top');
            this._hoverPointer.classList.remove('left');
            this._hoverPointer.classList.remove('right');
            this._hoverPointer.classList.remove('bottom');
            this.setHoverPointerPosition(targetRect);
        }
        this._hover.onContentsChanged();
    }
    computeXCordinate(target) {
        const hoverWidth = this._hover.containerDomNode.clientWidth + 2 /* Constants.HoverBorderWidth */;
        if (this._target.x !== undefined) {
            this._x = this._target.x;
        }
        else if (this._hoverPosition === 1 /* HoverPosition.RIGHT */) {
            this._x = target.right;
        }
        else if (this._hoverPosition === 0 /* HoverPosition.LEFT */) {
            this._x = target.left - hoverWidth;
        }
        else {
            if (this._hoverPointer) {
                this._x = target.center.x - this._hover.containerDomNode.clientWidth / 2;
            }
            else {
                this._x = target.left;
            }
            // Hover is going beyond window towards right end
            if (this._x + hoverWidth >= this._targetDocumentElement.clientWidth) {
                this._hover.containerDomNode.classList.add('right-aligned');
                this._x = Math.max(this._targetDocumentElement.clientWidth - hoverWidth - 2 /* Constants.HoverWindowEdgeMargin */, this._targetDocumentElement.clientLeft);
            }
        }
        // Hover is going beyond window towards left end
        if (this._x < this._targetDocumentElement.clientLeft) {
            this._x = target.left + 2 /* Constants.HoverWindowEdgeMargin */;
        }
    }
    computeYCordinate(target) {
        if (this._target.y !== undefined) {
            this._y = this._target.y;
        }
        else if (this._hoverPosition === 3 /* HoverPosition.ABOVE */) {
            this._y = target.top;
        }
        else if (this._hoverPosition === 2 /* HoverPosition.BELOW */) {
            this._y = target.bottom - 2;
        }
        else {
            if (this._hoverPointer) {
                this._y = target.center.y + this._hover.containerDomNode.clientHeight / 2;
            }
            else {
                this._y = target.bottom;
            }
        }
        // Hover on bottom is going beyond window
        if (this._y > this._targetWindow.innerHeight) {
            this._y = target.bottom;
        }
    }
    adjustHorizontalHoverPosition(target) {
        // Do not adjust horizontal hover position if x cordiante is provided
        if (this._target.x !== undefined) {
            return;
        }
        const hoverPointerOffset = this._hoverPointer ? 3 /* Constants.PointerSize */ : 0;
        // When force position is enabled, restrict max width
        if (this._forcePosition) {
            const padding = hoverPointerOffset + 2 /* Constants.HoverBorderWidth */;
            if (this._hoverPosition === 1 /* HoverPosition.RIGHT */) {
                this._hover.containerDomNode.style.maxWidth = `${this._targetDocumentElement.clientWidth - target.right - padding}px`;
            }
            else if (this._hoverPosition === 0 /* HoverPosition.LEFT */) {
                this._hover.containerDomNode.style.maxWidth = `${target.left - padding}px`;
            }
            return;
        }
        // Position hover on right to target
        if (this._hoverPosition === 1 /* HoverPosition.RIGHT */) {
            const roomOnRight = this._targetDocumentElement.clientWidth - target.right;
            // Hover on the right is going beyond window.
            if (roomOnRight < this._hover.containerDomNode.clientWidth + hoverPointerOffset) {
                const roomOnLeft = target.left;
                // There's enough room on the left, flip the hover position
                if (roomOnLeft >= this._hover.containerDomNode.clientWidth + hoverPointerOffset) {
                    this._hoverPosition = 0 /* HoverPosition.LEFT */;
                }
                // Hover on the left would go beyond window too
                else {
                    this._hoverPosition = 2 /* HoverPosition.BELOW */;
                }
            }
        }
        // Position hover on left to target
        else if (this._hoverPosition === 0 /* HoverPosition.LEFT */) {
            const roomOnLeft = target.left;
            // Hover on the left is going beyond window.
            if (roomOnLeft < this._hover.containerDomNode.clientWidth + hoverPointerOffset) {
                const roomOnRight = this._targetDocumentElement.clientWidth - target.right;
                // There's enough room on the right, flip the hover position
                if (roomOnRight >= this._hover.containerDomNode.clientWidth + hoverPointerOffset) {
                    this._hoverPosition = 1 /* HoverPosition.RIGHT */;
                }
                // Hover on the right would go beyond window too
                else {
                    this._hoverPosition = 2 /* HoverPosition.BELOW */;
                }
            }
            // Hover on the left is going beyond window.
            if (target.left - this._hover.containerDomNode.clientWidth - hoverPointerOffset <=
                this._targetDocumentElement.clientLeft) {
                this._hoverPosition = 1 /* HoverPosition.RIGHT */;
            }
        }
    }
    adjustVerticalHoverPosition(target) {
        // Do not adjust vertical hover position if the y coordinate is provided
        // or the position is forced
        if (this._target.y !== undefined || this._forcePosition) {
            return;
        }
        const hoverPointerOffset = this._hoverPointer ? 3 /* Constants.PointerSize */ : 0;
        // Position hover on top of the target
        if (this._hoverPosition === 3 /* HoverPosition.ABOVE */) {
            // Hover on top is going beyond window
            if (target.top - this._hover.containerDomNode.clientHeight - hoverPointerOffset < 0) {
                this._hoverPosition = 2 /* HoverPosition.BELOW */;
            }
        }
        // Position hover below the target
        else if (this._hoverPosition === 2 /* HoverPosition.BELOW */) {
            // Hover on bottom is going beyond window
            if (target.bottom + this._hover.containerDomNode.clientHeight + hoverPointerOffset >
                this._targetWindow.innerHeight) {
                this._hoverPosition = 3 /* HoverPosition.ABOVE */;
            }
        }
    }
    adjustHoverMaxHeight(target) {
        let maxHeight = this._targetWindow.innerHeight / 2;
        // When force position is enabled, restrict max height
        if (this._forcePosition) {
            const padding = (this._hoverPointer ? 3 /* Constants.PointerSize */ : 0) + 2 /* Constants.HoverBorderWidth */;
            if (this._hoverPosition === 3 /* HoverPosition.ABOVE */) {
                maxHeight = Math.min(maxHeight, target.top - padding);
            }
            else if (this._hoverPosition === 2 /* HoverPosition.BELOW */) {
                maxHeight = Math.min(maxHeight, this._targetWindow.innerHeight - target.bottom - padding);
            }
        }
        this._hover.containerDomNode.style.maxHeight = `${maxHeight}px`;
        if (this._hover.contentsDomNode.clientHeight < this._hover.contentsDomNode.scrollHeight) {
            // Add padding for a vertical scrollbar
            const extraRightPadding = `${this._hover.scrollbar.options.verticalScrollbarSize}px`;
            if (this._hover.contentsDomNode.style.paddingRight !== extraRightPadding) {
                this._hover.contentsDomNode.style.paddingRight = extraRightPadding;
            }
        }
    }
    setHoverPointerPosition(target) {
        if (!this._hoverPointer) {
            return;
        }
        switch (this._hoverPosition) {
            case 0 /* HoverPosition.LEFT */:
            case 1 /* HoverPosition.RIGHT */: {
                this._hoverPointer.classList.add(this._hoverPosition === 0 /* HoverPosition.LEFT */ ? 'right' : 'left');
                const hoverHeight = this._hover.containerDomNode.clientHeight;
                // If hover is taller than target, then show the pointer at the center of target
                if (hoverHeight > target.height) {
                    this._hoverPointer.style.top = `${target.center.y - (this._y - hoverHeight) - 3 /* Constants.PointerSize */}px`;
                }
                // Otherwise show the pointer at the center of hover
                else {
                    this._hoverPointer.style.top = `${Math.round(hoverHeight / 2) - 3 /* Constants.PointerSize */}px`;
                }
                break;
            }
            case 3 /* HoverPosition.ABOVE */:
            case 2 /* HoverPosition.BELOW */: {
                this._hoverPointer.classList.add(this._hoverPosition === 3 /* HoverPosition.ABOVE */ ? 'bottom' : 'top');
                const hoverWidth = this._hover.containerDomNode.clientWidth;
                // Position pointer at the center of the hover
                let pointerLeftPosition = Math.round(hoverWidth / 2) - 3 /* Constants.PointerSize */;
                // If pointer goes beyond target then position it at the center of the target
                const pointerX = this._x + pointerLeftPosition;
                if (pointerX < target.left || pointerX > target.right) {
                    pointerLeftPosition = target.center.x - this._x - 3 /* Constants.PointerSize */;
                }
                this._hoverPointer.style.left = `${pointerLeftPosition}px`;
                break;
            }
        }
    }
    focus() {
        this._hover.containerDomNode.focus();
    }
    hide() {
        this.dispose();
    }
    dispose() {
        if (!this._isDisposed) {
            this._onDispose.fire();
            this._target.dispose?.();
            this._hoverContainer.remove();
            this._messageListeners.dispose();
            super.dispose();
        }
        this._isDisposed = true;
    }
};
HoverWidget = __decorate([
    __param(1, IKeybindingService),
    __param(2, IConfigurationService),
    __param(3, IOpenerService),
    __param(4, IInstantiationService),
    __param(5, IAccessibilityService)
], HoverWidget);
export { HoverWidget };
class CompositeMouseTracker extends Widget {
    get onMouseOut() {
        return this._onMouseOut.event;
    }
    get isMouseIn() {
        return this._isMouseIn;
    }
    /**
     * @param _elements The target elements to track mouse in/out events on.
     * @param _eventDebounceDelay The delay in ms to debounce the event firing. This is used to
     * allow a short period for the mouse to move into the hover or a nearby target element. For
     * example hovering a scroll bar will not hide the hover immediately.
     */
    constructor(_elements, _eventDebounceDelay = 200) {
        super();
        this._elements = _elements;
        this._eventDebounceDelay = _eventDebounceDelay;
        this._isMouseIn = true;
        this._mouseTimer = this._register(new MutableDisposable());
        this._onMouseOut = this._register(new Emitter());
        for (const element of this._elements) {
            this.onmouseover(element, () => this._onTargetMouseOver());
            this.onmouseleave(element, () => this._onTargetMouseLeave());
        }
    }
    _onTargetMouseOver() {
        this._isMouseIn = true;
        this._mouseTimer.clear();
    }
    _onTargetMouseLeave() {
        this._isMouseIn = false;
        // Evaluate whether the mouse is still outside asynchronously such that other mouse targets
        // have the opportunity to first their mouse in event.
        this._mouseTimer.value = new TimeoutTimer(() => this._fireIfMouseOutside(), this._eventDebounceDelay);
    }
    _fireIfMouseOutside() {
        if (!this._isMouseIn) {
            this._onMouseOut.fire();
        }
    }
}
class ElementHoverTarget {
    constructor(_element) {
        this._element = _element;
        this.targetElements = [this._element];
    }
    dispose() { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zZXJ2aWNlcy9ob3ZlclNlcnZpY2UvaG92ZXJXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxhQUFhLENBQUE7QUFDcEIsT0FBTyxFQUNOLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFrQixNQUFNLHlDQUF5QyxDQUFBO0FBQzlGLE9BQU8sRUFDTixXQUFXLEVBRVgsV0FBVyxJQUFJLGVBQWUsRUFDOUIsMEJBQTBCLEdBQzFCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRTlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLG9CQUFvQixHQUNwQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1B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