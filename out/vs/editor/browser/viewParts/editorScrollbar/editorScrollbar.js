/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { SmoothScrollableElement, } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
import { getThemeTypeSelector } from '../../../../platform/theme/common/themeService.js';
/**
 * The editor scrollbar built on VS Code's scrollable element that sits beside
 * the minimap.
 */
export class EditorScrollbar extends ViewPart {
    constructor(context, linesContent, viewDomNode, overflowGuardDomNode) {
        super(context);
        const options = this._context.configuration.options;
        const scrollbar = options.get(108 /* EditorOption.scrollbar */);
        const mouseWheelScrollSensitivity = options.get(76 /* EditorOption.mouseWheelScrollSensitivity */);
        const fastScrollSensitivity = options.get(42 /* EditorOption.fastScrollSensitivity */);
        const scrollPredominantAxis = options.get(111 /* EditorOption.scrollPredominantAxis */);
        const scrollbarOptions = {
            listenOnDomNode: viewDomNode.domNode,
            className: 'editor-scrollable' + ' ' + getThemeTypeSelector(context.theme.type),
            useShadows: false,
            lazyRender: true,
            vertical: scrollbar.vertical,
            horizontal: scrollbar.horizontal,
            verticalHasArrows: scrollbar.verticalHasArrows,
            horizontalHasArrows: scrollbar.horizontalHasArrows,
            verticalScrollbarSize: scrollbar.verticalScrollbarSize,
            verticalSliderSize: scrollbar.verticalSliderSize,
            horizontalScrollbarSize: scrollbar.horizontalScrollbarSize,
            horizontalSliderSize: scrollbar.horizontalSliderSize,
            handleMouseWheel: scrollbar.handleMouseWheel,
            alwaysConsumeMouseWheel: scrollbar.alwaysConsumeMouseWheel,
            arrowSize: scrollbar.arrowSize,
            mouseWheelScrollSensitivity: mouseWheelScrollSensitivity,
            fastScrollSensitivity: fastScrollSensitivity,
            scrollPredominantAxis: scrollPredominantAxis,
            scrollByPage: scrollbar.scrollByPage,
        };
        this.scrollbar = this._register(new SmoothScrollableElement(linesContent.domNode, scrollbarOptions, this._context.viewLayout.getScrollable()));
        PartFingerprints.write(this.scrollbar.getDomNode(), 6 /* PartFingerprint.ScrollableElement */);
        this.scrollbarDomNode = createFastDomNode(this.scrollbar.getDomNode());
        this.scrollbarDomNode.setPosition('absolute');
        this._setLayout();
        // When having a zone widget that calls .focus() on one of its dom elements,
        // the browser will try desperately to reveal that dom node, unexpectedly
        // changing the .scrollTop of this.linesContent
        const onBrowserDesperateReveal = (domNode, lookAtScrollTop, lookAtScrollLeft) => {
            const newScrollPosition = {};
            if (lookAtScrollTop) {
                const deltaTop = domNode.scrollTop;
                if (deltaTop) {
                    newScrollPosition.scrollTop = this._context.viewLayout.getCurrentScrollTop() + deltaTop;
                    domNode.scrollTop = 0;
                }
            }
            if (lookAtScrollLeft) {
                const deltaLeft = domNode.scrollLeft;
                if (deltaLeft) {
                    newScrollPosition.scrollLeft = this._context.viewLayout.getCurrentScrollLeft() + deltaLeft;
                    domNode.scrollLeft = 0;
                }
            }
            this._context.viewModel.viewLayout.setScrollPosition(newScrollPosition, 1 /* ScrollType.Immediate */);
        };
        // I've seen this happen both on the view dom node & on the lines content dom node.
        this._register(dom.addDisposableListener(viewDomNode.domNode, 'scroll', (e) => onBrowserDesperateReveal(viewDomNode.domNode, true, true)));
        this._register(dom.addDisposableListener(linesContent.domNode, 'scroll', (e) => onBrowserDesperateReveal(linesContent.domNode, true, false)));
        this._register(dom.addDisposableListener(overflowGuardDomNode.domNode, 'scroll', (e) => onBrowserDesperateReveal(overflowGuardDomNode.domNode, true, false)));
        this._register(dom.addDisposableListener(this.scrollbarDomNode.domNode, 'scroll', (e) => onBrowserDesperateReveal(this.scrollbarDomNode.domNode, true, false)));
    }
    dispose() {
        super.dispose();
    }
    _setLayout() {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this.scrollbarDomNode.setLeft(layoutInfo.contentLeft);
        const minimap = options.get(74 /* EditorOption.minimap */);
        const side = minimap.side;
        if (side === 'right') {
            this.scrollbarDomNode.setWidth(layoutInfo.contentWidth + layoutInfo.minimap.minimapWidth);
        }
        else {
            this.scrollbarDomNode.setWidth(layoutInfo.contentWidth);
        }
        this.scrollbarDomNode.setHeight(layoutInfo.height);
    }
    getOverviewRulerLayoutInfo() {
        return this.scrollbar.getOverviewRulerLayoutInfo();
    }
    getDomNode() {
        return this.scrollbarDomNode;
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this.scrollbar.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this.scrollbar.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        if (e.hasChanged(108 /* EditorOption.scrollbar */) ||
            e.hasChanged(76 /* EditorOption.mouseWheelScrollSensitivity */) ||
            e.hasChanged(42 /* EditorOption.fastScrollSensitivity */)) {
            const options = this._context.configuration.options;
            const scrollbar = options.get(108 /* EditorOption.scrollbar */);
            const mouseWheelScrollSensitivity = options.get(76 /* EditorOption.mouseWheelScrollSensitivity */);
            const fastScrollSensitivity = options.get(42 /* EditorOption.fastScrollSensitivity */);
            const scrollPredominantAxis = options.get(111 /* EditorOption.scrollPredominantAxis */);
            const newOpts = {
                vertical: scrollbar.vertical,
                horizontal: scrollbar.horizontal,
                verticalScrollbarSize: scrollbar.verticalScrollbarSize,
                horizontalScrollbarSize: scrollbar.horizontalScrollbarSize,
                scrollByPage: scrollbar.scrollByPage,
                handleMouseWheel: scrollbar.handleMouseWheel,
                mouseWheelScrollSensitivity: mouseWheelScrollSensitivity,
                fastScrollSensitivity: fastScrollSensitivity,
                scrollPredominantAxis: scrollPredominantAxis,
            };
            this.scrollbar.updateOptions(newOpts);
        }
        if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
            this._setLayout();
        }
        return true;
    }
    onScrollChanged(e) {
        return true;
    }
    onThemeChanged(e) {
        this.scrollbar.updateClassName('editor-scrollable' + ' ' + getThemeTypeSelector(this._context.theme.type));
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        // Nothing to do
    }
    render(ctx) {
        this.scrollbar.renderNow();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2Nyb2xsYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL2VkaXRvclNjcm9sbGJhci9lZGl0b3JTY3JvbGxiYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RixPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNERBQTRELENBQUE7QUFLbkUsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUtwRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUl4Rjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxRQUFRO0lBSTVDLFlBQ0MsT0FBb0IsRUFDcEIsWUFBc0MsRUFDdEMsV0FBcUMsRUFDckMsb0JBQThDO1FBRTlDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVkLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNuRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxrQ0FBd0IsQ0FBQTtRQUNyRCxNQUFNLDJCQUEyQixHQUFHLE9BQU8sQ0FBQyxHQUFHLG1EQUEwQyxDQUFBO1FBQ3pGLE1BQU0scUJBQXFCLEdBQUcsT0FBTyxDQUFDLEdBQUcsNkNBQW9DLENBQUE7UUFDN0UsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsR0FBRyw4Q0FBb0MsQ0FBQTtRQUU3RSxNQUFNLGdCQUFnQixHQUFxQztZQUMxRCxlQUFlLEVBQUUsV0FBVyxDQUFDLE9BQU87WUFDcEMsU0FBUyxF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