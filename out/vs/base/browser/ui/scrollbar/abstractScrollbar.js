/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { createFastDomNode } from '../../fastDomNode.js';
import { GlobalPointerMoveMonitor } from '../../globalPointerMoveMonitor.js';
import { ScrollbarArrow } from './scrollbarArrow.js';
import { ScrollbarVisibilityController } from './scrollbarVisibilityController.js';
import { Widget } from '../widget.js';
import * as platform from '../../../common/platform.js';
/**
 * The orthogonal distance to the slider at which dragging "resets". This implements "snapping"
 */
const POINTER_DRAG_RESET_DISTANCE = 140;
export class AbstractScrollbar extends Widget {
    constructor(opts) {
        super();
        this._lazyRender = opts.lazyRender;
        this._host = opts.host;
        this._scrollable = opts.scrollable;
        this._scrollByPage = opts.scrollByPage;
        this._scrollbarState = opts.scrollbarState;
        this._visibilityController = this._register(new ScrollbarVisibilityController(opts.visibility, 'visible scrollbar ' + opts.extraScrollbarClassName, 'invisible scrollbar ' + opts.extraScrollbarClassName));
        this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded());
        this._pointerMoveMonitor = this._register(new GlobalPointerMoveMonitor());
        this._shouldRender = true;
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setAttribute('role', 'presentation');
        this.domNode.setAttribute('aria-hidden', 'true');
        this._visibilityController.setDomNode(this.domNode);
        this.domNode.setPosition('absolute');
        this._register(dom.addDisposableListener(this.domNode.domNode, dom.EventType.POINTER_DOWN, (e) => this._domNodePointerDown(e)));
    }
    // ----------------- creation
    /**
     * Creates the dom node for an arrow & adds it to the container
     */
    _createArrow(opts) {
        const arrow = this._register(new ScrollbarArrow(opts));
        this.domNode.domNode.appendChild(arrow.bgDomNode);
        this.domNode.domNode.appendChild(arrow.domNode);
    }
    /**
     * Creates the slider dom node, adds it to the container & hooks up the events
     */
    _createSlider(top, left, width, height) {
        this.slider = createFastDomNode(document.createElement('div'));
        this.slider.setClassName('slider');
        this.slider.setPosition('absolute');
        this.slider.setTop(top);
        this.slider.setLeft(left);
        if (typeof width === 'number') {
            this.slider.setWidth(width);
        }
        if (typeof height === 'number') {
            this.slider.setHeight(height);
        }
        this.slider.setLayerHinting(true);
        this.slider.setContain('strict');
        this.domNode.domNode.appendChild(this.slider.domNode);
        this._register(dom.addDisposableListener(this.slider.domNode, dom.EventType.POINTER_DOWN, (e) => {
            if (e.button === 0) {
                e.preventDefault();
                this._sliderPointerDown(e);
            }
        }));
        this.onclick(this.slider.domNode, (e) => {
            if (e.leftButton) {
                e.stopPropagation();
            }
        });
    }
    // ----------------- Update state
    _onElementSize(visibleSize) {
        if (this._scrollbarState.setVisibleSize(visibleSize)) {
            this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded());
            this._shouldRender = true;
            if (!this._lazyRender) {
                this.render();
            }
        }
        return this._shouldRender;
    }
    _onElementScrollSize(elementScrollSize) {
        if (this._scrollbarState.setScrollSize(elementScrollSize)) {
            this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded());
            this._shouldRender = true;
            if (!this._lazyRender) {
                this.render();
            }
        }
        return this._shouldRender;
    }
    _onElementScrollPosition(elementScrollPosition) {
        if (this._scrollbarState.setScrollPosition(elementScrollPosition)) {
            this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded());
            this._shouldRender = true;
            if (!this._lazyRender) {
                this.render();
            }
        }
        return this._shouldRender;
    }
    // ----------------- rendering
    beginReveal() {
        this._visibilityController.setShouldBeVisible(true);
    }
    beginHide() {
        this._visibilityController.setShouldBeVisible(false);
    }
    render() {
        if (!this._shouldRender) {
            return;
        }
        this._shouldRender = false;
        this._renderDomNode(this._scrollbarState.getRectangleLargeSize(), this._scrollbarState.getRectangleSmallSize());
        this._updateSlider(this._scrollbarState.getSliderSize(), this._scrollbarState.getArrowSize() + this._scrollbarState.getSliderPosition());
    }
    // ----------------- DOM events
    _domNodePointerDown(e) {
        if (e.target !== this.domNode.domNode) {
            return;
        }
        this._onPointerDown(e);
    }
    delegatePointerDown(e) {
        const domTop = this.domNode.domNode.getClientRects()[0].top;
        const sliderStart = domTop + this._scrollbarState.getSliderPosition();
        const sliderStop = domTop + this._scrollbarState.getSliderPosition() + this._scrollbarState.getSliderSize();
        const pointerPos = this._sliderPointerPosition(e);
        if (sliderStart <= pointerPos && pointerPos <= sliderStop) {
            // Act as if it was a pointer down on the slider
            if (e.button === 0) {
                e.preventDefault();
                this._sliderPointerDown(e);
            }
        }
        else {
            // Act as if it was a pointer down on the scrollbar
            this._onPointerDown(e);
        }
    }
    _onPointerDown(e) {
        let offsetX;
        let offsetY;
        if (e.target === this.domNode.domNode &&
            typeof e.offsetX === 'number' &&
            typeof e.offsetY === 'number') {
            offsetX = e.offsetX;
            offsetY = e.offsetY;
        }
        else {
            const domNodePosition = dom.getDomNodePagePosition(this.domNode.domNode);
            offsetX = e.pageX - domNodePosition.left;
            offsetY = e.pageY - domNodePosition.top;
        }
        const offset = this._pointerDownRelativePosition(offsetX, offsetY);
        this._setDesiredScrollPositionNow(this._scrollByPage
            ? this._scrollbarState.getDesiredScrollPositionFromOffsetPaged(offset)
            : this._scrollbarState.getDesiredScrollPositionFromOffset(offset));
        if (e.button === 0) {
            // left button
            e.preventDefault();
            this._sliderPointerDown(e);
        }
    }
    _sliderPointerDown(e) {
        if (!e.target || !(e.target instanceof Element)) {
            return;
        }
        const initialPointerPosition = this._sliderPointerPosition(e);
        const initialPointerOrthogonalPosition = this._sliderOrthogonalPointerPosition(e);
        const initialScrollbarState = this._scrollbarState.clone();
        this.slider.toggleClassName('active', true);
        this._pointerMoveMonitor.startMonitoring(e.target, e.pointerId, e.buttons, (pointerMoveData) => {
            const pointerOrthogonalPosition = this._sliderOrthogonalPointerPosition(pointerMoveData);
            const pointerOrthogonalDelta = Math.abs(pointerOrthogonalPosition - initialPointerOrthogonalPosition);
            if (platform.isWindows && pointerOrthogonalDelta > POINTER_DRAG_RESET_DISTANCE) {
                // The pointer has wondered away from the scrollbar => reset dragging
                this._setDesiredScrollPositionNow(initialScrollbarState.getScrollPosition());
                return;
            }
            const pointerPosition = this._sliderPointerPosition(pointerMoveData);
            const pointerDelta = pointerPosition - initialPointerPosition;
            this._setDesiredScrollPositionNow(initialScrollbarState.getDesiredScrollPositionFromDelta(pointerDelta));
        }, () => {
            this.slider.toggleClassName('active', false);
            this._host.onDragEnd();
        });
        this._host.onDragStart();
    }
    _setDesiredScrollPositionNow(_desiredScrollPosition) {
        const desiredScrollPosition = {};
        this.writeScrollPosition(desiredScrollPosition, _desiredScrollPosition);
        this._scrollable.setScrollPositionNow(desiredScrollPosition);
    }
    updateScrollbarSize(scrollbarSize) {
        this._updateScrollbarSize(scrollbarSize);
        this._scrollbarState.setScrollbarSize(scrollbarSize);
        this._shouldRender = true;
        if (!this._lazyRender) {
            this.render();
        }
    }
    isNeeded() {
        return this._scrollbarState.isNeeded();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RTY3JvbGxiYXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc2Nyb2xsYmFyL2Fic3RyYWN0U2Nyb2xsYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFBO0FBQ25DLE9BQU8sRUFBRSxpQkFBaUIsRUFBZSxNQUFNLHNCQUFzQixDQUFBO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVFLE9BQU8sRUFBRSxjQUFjLEVBQXlCLE1BQU0scUJBQXFCLENBQUE7QUFFM0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNyQyxPQUFPLEtBQUssUUFBUSxNQUFNLDZCQUE2QixDQUFBO0FBR3ZEOztHQUVHO0FBQ0gsTUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUE7QUF3QnZDLE1BQU0sT0FBZ0IsaUJBQWtCLFNBQVEsTUFBTTtJQWNyRCxZQUFZLElBQThCO1FBQ3pDLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtRQUN0QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtRQUMxQyxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDMUMsSUFBSSw2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