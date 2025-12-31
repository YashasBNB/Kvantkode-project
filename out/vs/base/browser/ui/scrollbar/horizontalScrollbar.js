/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StandardWheelEvent } from '../../mouseEvent.js';
import { AbstractScrollbar } from './abstractScrollbar.js';
import { ARROW_IMG_SIZE } from './scrollbarArrow.js';
import { ScrollbarState } from './scrollbarState.js';
import { Codicon } from '../../../common/codicons.js';
export class HorizontalScrollbar extends AbstractScrollbar {
    constructor(scrollable, options, host) {
        const scrollDimensions = scrollable.getScrollDimensions();
        const scrollPosition = scrollable.getCurrentScrollPosition();
        super({
            lazyRender: options.lazyRender,
            host: host,
            scrollbarState: new ScrollbarState(options.horizontalHasArrows ? options.arrowSize : 0, options.horizontal === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.horizontalScrollbarSize, options.vertical === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.verticalScrollbarSize, scrollDimensions.width, scrollDimensions.scrollWidth, scrollPosition.scrollLeft),
            visibility: options.horizontal,
            extraScrollbarClassName: 'horizontal',
            scrollable: scrollable,
            scrollByPage: options.scrollByPage,
        });
        if (options.horizontalHasArrows) {
            const arrowDelta = (options.arrowSize - ARROW_IMG_SIZE) / 2;
            const scrollbarDelta = (options.horizontalScrollbarSize - ARROW_IMG_SIZE) / 2;
            this._createArrow({
                className: 'scra',
                icon: Codicon.scrollbarButtonLeft,
                top: scrollbarDelta,
                left: arrowDelta,
                bottom: undefined,
                right: undefined,
                bgWidth: options.arrowSize,
                bgHeight: options.horizontalScrollbarSize,
                onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, 1, 0)),
            });
            this._createArrow({
                className: 'scra',
                icon: Codicon.scrollbarButtonRight,
                top: scrollbarDelta,
                left: undefined,
                bottom: undefined,
                right: arrowDelta,
                bgWidth: options.arrowSize,
                bgHeight: options.horizontalScrollbarSize,
                onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, -1, 0)),
            });
        }
        this._createSlider(Math.floor((options.horizontalScrollbarSize - options.horizontalSliderSize) / 2), 0, undefined, options.horizontalSliderSize);
    }
    _updateSlider(sliderSize, sliderPosition) {
        this.slider.setWidth(sliderSize);
        this.slider.setLeft(sliderPosition);
    }
    _renderDomNode(largeSize, smallSize) {
        this.domNode.setWidth(largeSize);
        this.domNode.setHeight(smallSize);
        this.domNode.setLeft(0);
        this.domNode.setBottom(0);
    }
    onDidScroll(e) {
        this._shouldRender = this._onElementScrollSize(e.scrollWidth) || this._shouldRender;
        this._shouldRender = this._onElementScrollPosition(e.scrollLeft) || this._shouldRender;
        this._shouldRender = this._onElementSize(e.width) || this._shouldRender;
        return this._shouldRender;
    }
    _pointerDownRelativePosition(offsetX, offsetY) {
        return offsetX;
    }
    _sliderPointerPosition(e) {
        return e.pageX;
    }
    _sliderOrthogonalPointerPosition(e) {
        return e.pageY;
    }
    _updateScrollbarSize(size) {
        this.slider.setHeight(size);
    }
    writeScrollPosition(target, scrollPosition) {
        target.scrollLeft = scrollPosition;
    }
    updateOptions(options) {
        this.updateScrollbarSize(options.horizontal === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.horizontalScrollbarSize);
        this._scrollbarState.setOppositeScrollbarSize(options.vertical === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.verticalScrollbarSize);
        this._visibilityController.setVisibility(options.horizontal);
        this._scrollByPage = options.scrollByPage;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9yaXpvbnRhbFNjcm9sbGJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9zY3JvbGxiYXIvaG9yaXpvbnRhbFNjcm9sbGJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQTBDLE1BQU0sd0JBQXdCLENBQUE7QUFFbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFRckQsTUFBTSxPQUFPLG1CQUFvQixTQUFRLGlCQUFpQjtJQUN6RCxZQUNDLFVBQXNCLEVBQ3RCLE9BQXlDLEVBQ3pDLElBQW1CO1FBRW5CLE1BQU0sZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDekQsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLHdCQUF3QixFQUFFLENBQUE7UUFDNUQsS0FBSyxDQUFDO1lBQ0wsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVO1lBQzlCLElBQUksRUFBRSxJQUFJO1lBQ1YsY0FBYyxFQUFFLElBQUksY0FBYyxDQUNqQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDbkQsT0FBTyxDQUFDLFVBQVUsdUNBQStCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUN2RixPQUFPLENBQUMsUUFBUSx1Q0FBK0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFD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