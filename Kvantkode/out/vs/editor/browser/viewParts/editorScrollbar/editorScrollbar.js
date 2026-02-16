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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2Nyb2xsYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvZWRpdG9yU2Nyb2xsYmFyL2VkaXRvclNjcm9sbGJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hGLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSw0REFBNEQsQ0FBQTtBQUtuRSxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBS3BGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBSXhGOzs7R0FHRztBQUNILE1BQU0sT0FBTyxlQUFnQixTQUFRLFFBQVE7SUFJNUMsWUFDQyxPQUFvQixFQUNwQixZQUFzQyxFQUN0QyxXQUFxQyxFQUNyQyxvQkFBOEM7UUFFOUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRWQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBQ25ELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF3QixDQUFBO1FBQ3JELE1BQU0sMkJBQTJCLEdBQUcsT0FBTyxDQUFDLEdBQUcsbURBQTBDLENBQUE7UUFDekYsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsR0FBRyw2Q0FBb0MsQ0FBQTtRQUM3RSxNQUFNLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxHQUFHLDhDQUFvQyxDQUFBO1FBRTdFLE1BQU0sZ0JBQWdCLEdBQXFDO1lBQzFELGVBQWUsRUFBRSxXQUFX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