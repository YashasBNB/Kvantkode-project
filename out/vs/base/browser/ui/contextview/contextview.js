/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BrowserFeatures } from '../../canIUse.js';
import * as DOM from '../../dom.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../common/lifecycle.js';
import * as platform from '../../../common/platform.js';
import { Range } from '../../../common/range.js';
import './contextview.css';
export var ContextViewDOMPosition;
(function (ContextViewDOMPosition) {
    ContextViewDOMPosition[ContextViewDOMPosition["ABSOLUTE"] = 1] = "ABSOLUTE";
    ContextViewDOMPosition[ContextViewDOMPosition["FIXED"] = 2] = "FIXED";
    ContextViewDOMPosition[ContextViewDOMPosition["FIXED_SHADOW"] = 3] = "FIXED_SHADOW";
})(ContextViewDOMPosition || (ContextViewDOMPosition = {}));
export function isAnchor(obj) {
    const anchor = obj;
    return !!anchor && typeof anchor.x === 'number' && typeof anchor.y === 'number';
}
export var AnchorAlignment;
(function (AnchorAlignment) {
    AnchorAlignment[AnchorAlignment["LEFT"] = 0] = "LEFT";
    AnchorAlignment[AnchorAlignment["RIGHT"] = 1] = "RIGHT";
})(AnchorAlignment || (AnchorAlignment = {}));
export var AnchorPosition;
(function (AnchorPosition) {
    AnchorPosition[AnchorPosition["BELOW"] = 0] = "BELOW";
    AnchorPosition[AnchorPosition["ABOVE"] = 1] = "ABOVE";
})(AnchorPosition || (AnchorPosition = {}));
export var AnchorAxisAlignment;
(function (AnchorAxisAlignment) {
    AnchorAxisAlignment[AnchorAxisAlignment["VERTICAL"] = 0] = "VERTICAL";
    AnchorAxisAlignment[AnchorAxisAlignment["HORIZONTAL"] = 1] = "HORIZONTAL";
})(AnchorAxisAlignment || (AnchorAxisAlignment = {}));
export var LayoutAnchorPosition;
(function (LayoutAnchorPosition) {
    LayoutAnchorPosition[LayoutAnchorPosition["Before"] = 0] = "Before";
    LayoutAnchorPosition[LayoutAnchorPosition["After"] = 1] = "After";
})(LayoutAnchorPosition || (LayoutAnchorPosition = {}));
export var LayoutAnchorMode;
(function (LayoutAnchorMode) {
    LayoutAnchorMode[LayoutAnchorMode["AVOID"] = 0] = "AVOID";
    LayoutAnchorMode[LayoutAnchorMode["ALIGN"] = 1] = "ALIGN";
})(LayoutAnchorMode || (LayoutAnchorMode = {}));
/**
 * Lays out a one dimensional view next to an anchor in a viewport.
 *
 * @returns The view offset within the viewport.
 */
export function layout(viewportSize, viewSize, anchor) {
    const layoutAfterAnchorBoundary = anchor.mode === LayoutAnchorMode.ALIGN ? anchor.offset : anchor.offset + anchor.size;
    const layoutBeforeAnchorBoundary = anchor.mode === LayoutAnchorMode.ALIGN ? anchor.offset + anchor.size : anchor.offset;
    if (anchor.position === 0 /* LayoutAnchorPosition.Before */) {
        if (viewSize <= viewportSize - layoutAfterAnchorBoundary) {
            return layoutAfterAnchorBoundary; // happy case, lay it out after the anchor
        }
        if (viewSize <= layoutBeforeAnchorBoundary) {
            return layoutBeforeAnchorBoundary - viewSize; // ok case, lay it out before the anchor
        }
        return Math.max(viewportSize - viewSize, 0); // sad case, lay it over the anchor
    }
    else {
        if (viewSize <= layoutBeforeAnchorBoundary) {
            return layoutBeforeAnchorBoundary - viewSize; // happy case, lay it out before the anchor
        }
        if (viewSize <= viewportSize - layoutAfterAnchorBoundary) {
            return layoutAfterAnchorBoundary; // ok case, lay it out after the anchor
        }
        return 0; // sad case, lay it over the anchor
    }
}
export class ContextView extends Disposable {
    static { this.BUBBLE_UP_EVENTS = ['click', 'keydown', 'focus', 'blur']; }
    static { this.BUBBLE_DOWN_EVENTS = ['click']; }
    constructor(container, domPosition) {
        super();
        this.container = null;
        this.useFixedPosition = false;
        this.useShadowDOM = false;
        this.delegate = null;
        this.toDisposeOnClean = Disposable.None;
        this.toDisposeOnSetContainer = Disposable.None;
        this.shadowRoot = null;
        this.shadowRootHostElement = null;
        this.view = DOM.$('.context-view');
        DOM.hide(this.view);
        this.setContainer(container, domPosition);
        this._register(toDisposable(() => this.setContainer(null, 1 /* ContextViewDOMPosition.ABSOLUTE */)));
    }
    setContainer(container, domPosition) {
        this.useFixedPosition = domPosition !== 1 /* ContextViewDOMPosition.ABSOLUTE */;
        const usedShadowDOM = this.useShadowDOM;
        this.useShadowDOM = domPosition === 3 /* ContextViewDOMPosition.FIXED_SHADOW */;
        if (container === this.container && usedShadowDOM === this.useShadowDOM) {
            return; // container is the same and no shadow DOM usage has changed
        }
        if (this.container) {
            this.toDisposeOnSetContainer.dispose();
            this.view.remove();
            if (this.shadowRoot) {
                this.shadowRoot = null;
                this.shadowRootHostElement?.remove();
                this.shadowRootHostElement = null;
            }
            this.container = null;
        }
        if (container) {
            this.container = container;
            if (this.useShadowDOM) {
                this.shadowRootHostElement = DOM.$('.shadow-root-host');
                this.container.appendChild(this.shadowRootHostElement);
                this.shadowRoot = this.shadowRootHostElement.attachShadow({ mode: 'open' });
                const style = document.createElement('style');
                style.textContent = SHADOW_ROOT_CSS;
                this.shadowRoot.appendChild(style);
                this.shadowRoot.appendChild(this.view);
                this.shadowRoot.appendChild(DOM.$('slot'));
            }
            else {
                this.container.appendChild(this.view);
            }
            const toDisposeOnSetContainer = new DisposableStore();
            ContextView.BUBBLE_UP_EVENTS.forEach((event) => {
                toDisposeOnSetContainer.add(DOM.addStandardDisposableListener(this.container, event, (e) => {
                    this.onDOMEvent(e, false);
                }));
            });
            ContextView.BUBBLE_DOWN_EVENTS.forEach((event) => {
                toDisposeOnSetContainer.add(DOM.addStandardDisposableListener(this.container, event, (e) => {
                    this.onDOMEvent(e, true);
                }, true));
            });
            this.toDisposeOnSetContainer = toDisposeOnSetContainer;
        }
    }
    show(delegate) {
        if (this.isVisible()) {
            this.hide();
        }
        // Show static box
        DOM.clearNode(this.view);
        this.view.className = 'context-view monaco-component';
        this.view.style.top = '0px';
        this.view.style.left = '0px';
        this.view.style.zIndex = `${2575 + (delegate.layer ?? 0)}`;
        this.view.style.position = this.useFixedPosition ? 'fixed' : 'absolute';
        DOM.show(this.view);
        // Render content
        this.toDisposeOnClean = delegate.render(this.view) || Disposable.None;
        // Set active delegate
        this.delegate = delegate;
        // Layout
        this.doLayout();
        // Focus
        this.delegate.focus?.();
    }
    getViewElement() {
        return this.view;
    }
    layout() {
        if (!this.isVisible()) {
            return;
        }
        if (this.delegate.canRelayout === false &&
            !(platform.isIOS && BrowserFeatures.pointerEvents)) {
            this.hide();
            return;
        }
        this.delegate?.layout?.();
        this.doLayout();
    }
    doLayout() {
        // Check that we still have a delegate - this.delegate.layout may have hidden
        if (!this.isVisible()) {
            return;
        }
        // Get anchor
        const anchor = this.delegate.getAnchor();
        // Compute around
        let around;
        // Get the element's position and size (to anchor the view)
        if (DOM.isHTMLElement(anchor)) {
            const elementPosition = DOM.getDomNodePagePosition(anchor);
            // In areas where zoom is applied to the element or its ancestors, we need to adjust the size of the element
            // e.g. The title bar has counter zoom behavior meaning it applies the inverse of zoom level.
            // Window Zoom Level: 1.5, Title Bar Zoom: 1/1.5, Size Multiplier: 1.5
            const zoom = DOM.getDomNodeZoomLevel(anchor);
            around = {
                top: elementPosition.top * zoom,
                left: elementPosition.left * zoom,
                width: elementPosition.width * zoom,
                height: elementPosition.height * zoom,
            };
        }
        else if (isAnchor(anchor)) {
            around = {
                top: anchor.y,
                left: anchor.x,
                width: anchor.width || 1,
                height: anchor.height || 2,
            };
        }
        else {
            around = {
                top: anchor.posy,
                left: anchor.posx,
                // We are about to position the context view where the mouse
                // cursor is. To prevent the view being exactly under the mouse
                // when showing and thus potentially triggering an action within,
                // we treat the mouse location like a small sized block element.
                width: 2,
                height: 2,
            };
        }
        const viewSizeWidth = DOM.getTotalWidth(this.view);
        const viewSizeHeight = DOM.getTotalHeight(this.view);
        const anchorPosition = this.delegate.anchorPosition ?? 0 /* AnchorPosition.BELOW */;
        const anchorAlignment = this.delegate.anchorAlignment ?? 0 /* AnchorAlignment.LEFT */;
        const anchorAxisAlignment = this.delegate.anchorAxisAlignment ?? 0 /* AnchorAxisAlignment.VERTICAL */;
        let top;
        let left;
        const activeWindow = DOM.getActiveWindow();
        if (anchorAxisAlignment === 0 /* AnchorAxisAlignment.VERTICAL */) {
            const verticalAnchor = {
                offset: around.top - activeWindow.pageYOffset,
                size: around.height,
                position: anchorPosition === 0 /* AnchorPosition.BELOW */
                    ? 0 /* LayoutAnchorPosition.Before */
                    : 1 /* LayoutAnchorPosition.After */,
            };
            const horizontalAnchor = {
                offset: around.left,
                size: around.width,
                position: anchorAlignment === 0 /* AnchorAlignment.LEFT */
                    ? 0 /* LayoutAnchorPosition.Before */
                    : 1 /* LayoutAnchorPosition.After */,
                mode: LayoutAnchorMode.ALIGN,
            };
            top =
                layout(activeWindow.innerHeight, viewSizeHeight, verticalAnchor) + activeWindow.pageYOffset;
            // if view intersects vertically with anchor,  we must avoid the anchor
            if (Range.intersects({ start: top, end: top + viewSizeHeight }, { start: verticalAnchor.offset, end: verticalAnchor.offset + verticalAnchor.size })) {
                horizontalAnchor.mode = LayoutAnchorMode.AVOID;
            }
            left = layout(activeWindow.innerWidth, viewSizeWidth, horizontalAnchor);
        }
        else {
            const horizontalAnchor = {
                offset: around.left,
                size: around.width,
                position: anchorAlignment === 0 /* AnchorAlignment.LEFT */
                    ? 0 /* LayoutAnchorPosition.Before */
                    : 1 /* LayoutAnchorPosition.After */,
            };
            const verticalAnchor = {
                offset: around.top,
                size: around.height,
                position: anchorPosition === 0 /* AnchorPosition.BELOW */
                    ? 0 /* LayoutAnchorPosition.Before */
                    : 1 /* LayoutAnchorPosition.After */,
                mode: LayoutAnchorMode.ALIGN,
            };
            left = layout(activeWindow.innerWidth, viewSizeWidth, horizontalAnchor);
            // if view intersects horizontally with anchor, we must avoid the anchor
            if (Range.intersects({ start: left, end: left + viewSizeWidth }, { start: horizontalAnchor.offset, end: horizontalAnchor.offset + horizontalAnchor.size })) {
                verticalAnchor.mode = LayoutAnchorMode.AVOID;
            }
            top =
                layout(activeWindow.innerHeight, viewSizeHeight, verticalAnchor) + activeWindow.pageYOffset;
        }
        this.view.classList.remove('top', 'bottom', 'left', 'right');
        this.view.classList.add(anchorPosition === 0 /* AnchorPosition.BELOW */ ? 'bottom' : 'top');
        this.view.classList.add(anchorAlignment === 0 /* AnchorAlignment.LEFT */ ? 'left' : 'right');
        this.view.classList.toggle('fixed', this.useFixedPosition);
        const containerPosition = DOM.getDomNodePagePosition(this.container);
        this.view.style.top = `${top - (this.useFixedPosition ? DOM.getDomNodePagePosition(this.view).top : containerPosition.top)}px`;
        this.view.style.left = `${left - (this.useFixedPosition ? DOM.getDomNodePagePosition(this.view).left : containerPosition.left)}px`;
        this.view.style.width = 'initial';
    }
    hide(data) {
        const delegate = this.delegate;
        this.delegate = null;
        if (delegate?.onHide) {
            delegate.onHide(data);
        }
        this.toDisposeOnClean.dispose();
        DOM.hide(this.view);
    }
    isVisible() {
        return !!this.delegate;
    }
    onDOMEvent(e, onCapture) {
        if (this.delegate) {
            if (this.delegate.onDOMEvent) {
                this.delegate.onDOMEvent(e, DOM.getWindow(e).document.activeElement);
            }
            else if (onCapture && !DOM.isAncestor(e.target, this.container)) {
                this.hide();
            }
        }
    }
    dispose() {
        this.hide();
        super.dispose();
    }
}
const SHADOW_ROOT_CSS = /* css */ `
	:host {
		all: initial; /* 1st rule so subsequent properties are reset. */
	}

	.codicon[class*='codicon-'] {
		font: normal normal normal 16px/1 codicon;
		display: inline-block;
		text-decoration: none;
		text-rendering: auto;
		text-align: center;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		user-select: none;
		-webkit-user-select: none;
		-ms-user-select: none;
	}

	:host {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", "HelveticaNeue-Light", system-ui, "Ubuntu", "Droid Sans", sans-serif;
	}

	:host-context(.mac) { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
	:host-context(.mac:lang(zh-Hans)) { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", sans-serif; }
	:host-context(.mac:lang(zh-Hant)) { font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif; }
	:host-context(.mac:lang(ja)) { font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic Pro", sans-serif; }
	:host-context(.mac:lang(ko)) { font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Nanum Gothic", "AppleGothic", sans-serif; }

	:host-context(.windows) { font-family: "Segoe WPC", "Segoe UI", sans-serif; }
	:host-context(.windows:lang(zh-Hans)) { font-family: "Segoe WPC", "Segoe UI", "Microsoft YaHei", sans-serif; }
	:host-context(.windows:lang(zh-Hant)) { font-family: "Segoe WPC", "Segoe UI", "Microsoft Jhenghei", sans-serif; }
	:host-context(.windows:lang(ja)) { font-family: "Segoe WPC", "Segoe UI", "Yu Gothic UI", "Meiryo UI", sans-serif; }
	:host-context(.windows:lang(ko)) { font-family: "Segoe WPC", "Segoe UI", "Malgun Gothic", "Dotom", sans-serif; }

	:host-context(.linux) { font-family: system-ui, "Ubuntu", "Droid Sans", sans-serif; }
	:host-context(.linux:lang(zh-Hans)) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans SC", "Source Han Sans CN", "Source Han Sans", sans-serif; }
	:host-context(.linux:lang(zh-Hant)) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans TC", "Source Han Sans TW", "Source Han Sans", sans-serif; }
	:host-context(.linux:lang(ja)) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans J", "Source Han Sans JP", "Source Han Sans", sans-serif; }
	:host-context(.linux:lang(ko)) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans K", "Source Han Sans JR", "Source Han Sans", "UnDotum", "FBaekmuk Gulim", sans-serif; }
`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dHZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvY29udGV4dHZpZXcvY29udGV4dHZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ2xELE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFBO0FBRW5DLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sS0FBSyxRQUFRLE1BQU0sNkJBQTZCLENBQUE7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRWhELE9BQU8sbUJBQW1CLENBQUE7QUFFMUIsTUFBTSxDQUFOLElBQWtCLHNCQUlqQjtBQUpELFdBQWtCLHNCQUFzQjtJQUN2QywyRUFBWSxDQUFBO0lBQ1oscUVBQUssQ0FBQTtJQUNMLG1GQUFZLENBQUE7QUFDYixDQUFDLEVBSmlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFJdkM7QUFTRCxNQUFNLFVBQVUsUUFBUSxDQUFDLEdBQVk7SUFDcEMsTUFBTSxNQUFNLEdBQUcsR0FBa0QsQ0FBQTtJQUVqRSxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLENBQUMsQ0FBQyxLQUFLLFFBQVEsSUFBSSxPQUFPLE1BQU0sQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFBO0FBQ2hGLENBQUM7QUFFRCxNQUFNLENBQU4sSUFBa0IsZUFHakI7QUFIRCxXQUFrQixlQUFlO0lBQ2hDLHFEQUFJLENBQUE7SUFDSix1REFBSyxDQUFBO0FBQ04sQ0FBQyxFQUhpQixlQUFlLEtBQWYsZUFBZSxRQUdoQztBQUVELE1BQU0sQ0FBTixJQUFrQixjQUdqQjtBQUhELFdB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