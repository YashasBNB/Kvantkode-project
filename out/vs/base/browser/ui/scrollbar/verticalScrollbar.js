/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StandardWheelEvent } from '../../mouseEvent.js';
import { AbstractScrollbar } from './abstractScrollbar.js';
import { ARROW_IMG_SIZE } from './scrollbarArrow.js';
import { ScrollbarState } from './scrollbarState.js';
import { Codicon } from '../../../common/codicons.js';
export class VerticalScrollbar extends AbstractScrollbar {
    constructor(scrollable, options, host) {
        const scrollDimensions = scrollable.getScrollDimensions();
        const scrollPosition = scrollable.getCurrentScrollPosition();
        super({
            lazyRender: options.lazyRender,
            host: host,
            scrollbarState: new ScrollbarState(options.verticalHasArrows ? options.arrowSize : 0, options.vertical === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.verticalScrollbarSize, 
            // give priority to vertical scroll bar over horizontal and let it scroll all the way to the bottom
            0, scrollDimensions.height, scrollDimensions.scrollHeight, scrollPosition.scrollTop),
            visibility: options.vertical,
            extraScrollbarClassName: 'vertical',
            scrollable: scrollable,
            scrollByPage: options.scrollByPage,
        });
        if (options.verticalHasArrows) {
            const arrowDelta = (options.arrowSize - ARROW_IMG_SIZE) / 2;
            const scrollbarDelta = (options.verticalScrollbarSize - ARROW_IMG_SIZE) / 2;
            this._createArrow({
                className: 'scra',
                icon: Codicon.scrollbarButtonUp,
                top: arrowDelta,
                left: scrollbarDelta,
                bottom: undefined,
                right: undefined,
                bgWidth: options.verticalScrollbarSize,
                bgHeight: options.arrowSize,
                onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, 0, 1)),
            });
            this._createArrow({
                className: 'scra',
                icon: Codicon.scrollbarButtonDown,
                top: undefined,
                left: scrollbarDelta,
                bottom: arrowDelta,
                right: undefined,
                bgWidth: options.verticalScrollbarSize,
                bgHeight: options.arrowSize,
                onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, 0, -1)),
            });
        }
        this._createSlider(0, Math.floor((options.verticalScrollbarSize - options.verticalSliderSize) / 2), options.verticalSliderSize, undefined);
    }
    _updateSlider(sliderSize, sliderPosition) {
        this.slider.setHeight(sliderSize);
        this.slider.setTop(sliderPosition);
    }
    _renderDomNode(largeSize, smallSize) {
        this.domNode.setWidth(smallSize);
        this.domNode.setHeight(largeSize);
        this.domNode.setRight(0);
        this.domNode.setTop(0);
    }
    onDidScroll(e) {
        this._shouldRender = this._onElementScrollSize(e.scrollHeight) || this._shouldRender;
        this._shouldRender = this._onElementScrollPosition(e.scrollTop) || this._shouldRender;
        this._shouldRender = this._onElementSize(e.height) || this._shouldRender;
        return this._shouldRender;
    }
    _pointerDownRelativePosition(offsetX, offsetY) {
        return offsetY;
    }
    _sliderPointerPosition(e) {
        return e.pageY;
    }
    _sliderOrthogonalPointerPosition(e) {
        return e.pageX;
    }
    _updateScrollbarSize(size) {
        this.slider.setWidth(size);
    }
    writeScrollPosition(target, scrollPosition) {
        target.scrollTop = scrollPosition;
    }
    updateOptions(options) {
        this.updateScrollbarSize(options.vertical === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.verticalScrollbarSize);
        // give priority to vertical scroll bar over horizontal and let it scroll all the way to the bottom
        this._scrollbarState.setOppositeScrollbarSize(0);
        this._visibilityController.setVisibility(options.vertical);
        this._scrollByPage = options.scrollByPage;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVydGljYWxTY3JvbGxiYXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc2Nyb2xsYmFyL3ZlcnRpY2FsU2Nyb2xsYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBMEMsTUFBTSx3QkFBd0IsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQVFyRCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsaUJBQWlCO0lBQ3ZELFlBQ0MsVUFBc0IsRUFDdEIsT0FBeUMsRUFDekMsSUFBbUI7UUFFbkIsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN6RCxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUM1RCxLQUFLLENBQUM7WUFDTCxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVU7WUFDOUIsSUFBSSxFQUFFLElBQUk7WUFDVixjQUFjLEVBQUUsSUFBSSxjQUFjLENBQ2pDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNqRCxPQUFPLENBQUMsUUFBUSx1Q0FBK0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMscUJBQXFCO1lBQ25GLG1HQUFtRztZQUNuRyxDQUFDLEVBQ0QsZ0JBQWdCLENBQUMsTUFBTSxFQUN2QixnQkFB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