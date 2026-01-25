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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9yaXpvbnRhbFNjcm9sbGJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3Njcm9sbGJhci9ob3Jpem9udGFsU2Nyb2xsYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBMEMsTUFBTSx3QkFBd0IsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQVFyRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsaUJBQWlCO0lBQ3pELFlBQ0MsVUFBc0IsRUFDdEIsT0FBeUMsRUFDekMsSUFBbUI7UUFFbkIsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN6RCxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUM1RCxLQUFLLENBQUM7WUFDTCxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVU7WUFDOUIsSUFBSSxFQUFFLElBQUk7WUFDVixjQUFjLEVBQUUsSUFBSSxjQUFjLENBQ2pDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNuRCxPQUFPLENBQUMsVUFBVSx1Q0FBK0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQ3ZGLE9BQU8sQ0FBQyxRQUFRLHVDQUErQixDQUFDLENBQUMsQ0FBQyxDQUFD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