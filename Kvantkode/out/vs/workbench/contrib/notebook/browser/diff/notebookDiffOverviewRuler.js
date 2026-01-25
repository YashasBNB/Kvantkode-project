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
import * as DOM from '../../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { Color } from '../../../../../base/common/color.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { defaultInsertColor, defaultRemoveColor, diffInserted, diffOverviewRulerInserted, diffOverviewRulerRemoved, diffRemoved, } from '../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, Themable, } from '../../../../../platform/theme/common/themeService.js';
const MINIMUM_SLIDER_SIZE = 20;
let NotebookDiffOverviewRuler = class NotebookDiffOverviewRuler extends Themable {
    constructor(notebookEditor, width, container, themeService) {
        super(themeService);
        this.notebookEditor = notebookEditor;
        this.width = width;
        this._diffElementViewModels = [];
        this._lanes = 2;
        this._insertColor = null;
        this._removeColor = null;
        this._insertColorHex = null;
        this._removeColorHex = null;
        this._disposables = this._register(new DisposableStore());
        this._renderAnimationFrame = null;
        this._domNode = createFastDomNode(document.createElement('canvas'));
        this._domNode.setPosition('relative');
        this._domNode.setLayerHinting(true);
        this._domNode.setContain('strict');
        container.appendChild(this._domNode.domNode);
        this._overviewViewportDomElement = createFastDomNode(document.createElement('div'));
        this._overviewViewportDomElement.setClassName('diffViewport');
        this._overviewViewportDomElement.setPosition('absolute');
        this._overviewViewportDomElement.setWidth(width);
        container.appendChild(this._overviewViewportDomElement.domNode);
        this._register(PixelRatio.getInstance(DOM.getWindow(this._domNode.domNode)).onDidChange(() => {
            this._scheduleRender();
        }));
        this._register(this.themeService.onDidColorThemeChange((e) => {
            const colorChanged = this.applyColors(e);
            if (colorChanged) {
                this._scheduleRender();
            }
        }));
        this.applyColors(this.themeService.getColorTheme());
        this._register(this.notebookEditor.onDidScroll(() => {
            this._renderOverviewViewport();
        }));
        this._register(DOM.addStandardDisposableListener(container, DOM.EventType.POINTER_DOWN, (e) => {
            this.notebookEditor.delegateVerticalScrollbarPointerDown(e);
        }));
    }
    applyColors(theme) {
        const newInsertColor = theme.getColor(diffOverviewRulerInserted) ||
            (theme.getColor(diffInserted) || defaultInsertColor).transparent(2);
        const newRemoveColor = theme.getColor(diffOverviewRulerRemoved) ||
            (theme.getColor(diffRemoved) || defaultRemoveColor).transparent(2);
        const hasChanges = !newInsertColor.equals(this._insertColor) || !newRemoveColor.equals(this._removeColor);
        this._insertColor = newInsertColor;
        this._removeColor = newRemoveColor;
        if (this._insertColor) {
            this._insertColorHex = Color.Format.CSS.formatHexA(this._insertColor);
        }
        if (this._removeColor) {
            this._removeColorHex = Color.Format.CSS.formatHexA(this._removeColor);
        }
        return hasChanges;
    }
    layout() {
        this._layoutNow();
    }
    updateViewModels(elements, eventDispatcher) {
        this._disposables.clear();
        this._diffElementViewModels = elements;
        if (eventDispatcher) {
            this._disposables.add(eventDispatcher.onDidChangeLayout(() => {
                this._scheduleRender();
            }));
            this._disposables.add(eventDispatcher.onDidChangeCellLayout(() => {
                this._scheduleRender();
            }));
        }
        this._scheduleRender();
    }
    _scheduleRender() {
        if (this._renderAnimationFrame === null) {
            this._renderAnimationFrame = DOM.runAtThisOrScheduleAtNextAnimationFrame(DOM.getWindow(this._domNode.domNode), this._onRenderScheduled.bind(this), 16);
        }
    }
    _onRenderScheduled() {
        this._renderAnimationFrame = null;
        this._layoutNow();
    }
    _layoutNow() {
        const layoutInfo = this.notebookEditor.getLayoutInfo();
        const height = layoutInfo.height;
        const contentHeight = this._diffElementViewModels
            .map((view) => view.totalHeight)
            .reduce((a, b) => a + b, 0);
        const ratio = PixelRatio.getInstance(DOM.getWindow(this._domNode.domNode)).value;
        this._domNode.setWidth(this.width);
        this._domNode.setHeight(height);
        this._domNode.domNode.width = this.width * ratio;
        this._domNode.domNode.height = height * ratio;
        const ctx = this._domNode.domNode.getContext('2d');
        ctx.clearRect(0, 0, this.width * ratio, height * ratio);
        this._renderCanvas(ctx, this.width * ratio, height * ratio, contentHeight * ratio, ratio);
        this._renderOverviewViewport();
    }
    _renderOverviewViewport() {
        const layout = this._computeOverviewViewport();
        if (!layout) {
            this._overviewViewportDomElement.setTop(0);
            this._overviewViewportDomElement.setHeight(0);
        }
        else {
            this._overviewViewportDomElement.setTop(layout.top);
            this._overviewViewportDomElement.setHeight(layout.height);
        }
    }
    _computeOverviewViewport() {
        const layoutInfo = this.notebookEditor.getLayoutInfo();
        if (!layoutInfo) {
            return null;
        }
        const scrollTop = this.notebookEditor.getScrollTop();
        const scrollHeight = this.notebookEditor.getScrollHeight();
        const computedAvailableSize = Math.max(0, layoutInfo.height);
        const computedRepresentableSize = Math.max(0, computedAvailableSize - 2 * 0);
        const visibleSize = layoutInfo.height;
        const computedSliderSize = Math.round(Math.max(MINIMUM_SLIDER_SIZE, Math.floor((visibleSize * computedRepresentableSize) / scrollHeight)));
        const computedSliderRatio = (computedRepresentableSize - computedSliderSize) / (scrollHeight - visibleSize);
        const computedSliderPosition = Math.round(scrollTop * computedSliderRatio);
        return {
            height: computedSliderSize,
            top: computedSliderPosition,
        };
    }
    _renderCanvas(ctx, width, height, scrollHeight, ratio) {
        if (!this._insertColorHex || !this._removeColorHex) {
            // no op when colors are not yet known
            return;
        }
        const laneWidth = width / this._lanes;
        let currentFrom = 0;
        for (let i = 0; i < this._diffElementViewModels.length; i++) {
            const element = this._diffElementViewModels[i];
            const cellHeight = Math.round((element.totalHeight / scrollHeight) * ratio * height);
            switch (element.type) {
                case 'insert':
                    ctx.fillStyle = this._insertColorHex;
                    ctx.fillRect(laneWidth, currentFrom, laneWidth, cellHeight);
                    break;
                case 'delete':
                    ctx.fillStyle = this._removeColorHex;
                    ctx.fillRect(0, currentFrom, laneWidth, cellHeight);
                    break;
                case 'unchanged':
                case 'unchangedMetadata':
                    break;
                case 'modified':
                case 'modifiedMetadata':
                    ctx.fillStyle = this._removeColorHex;
                    ctx.fillRect(0, currentFrom, laneWidth, cellHeight);
                    ctx.fillStyle = this._insertColorHex;
                    ctx.fillRect(laneWidth, currentFrom, laneWidth, cellHeight);
                    break;
            }
            currentFrom += cellHeight;
        }
    }
    dispose() {
        if (this._renderAnimationFrame !== null) {
            this._renderAnimationFrame.dispose();
            this._renderAnimationFrame = null;
        }
        super.dispose();
    }
};
NotebookDiffOverviewRuler = __decorate([
    __param(3, IThemeService)
], NotebookDiffOverviewRuler);
export { NotebookDiffOverviewRuler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmT3ZlcnZpZXdSdWxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL25vdGVib29rRGlmZk92ZXJ2aWV3UnVsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixZQUFZLEVBQ1oseUJBQXlCLEVBQ3pCLHdCQUF3QixFQUN4QixXQUFXLEdBQ1gsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBRU4sYUFBYSxFQUNiLFFBQVEsR0FDUixNQUFNLHNEQUFzRCxDQUFBO0FBSzdELE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0FBRXZCLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsUUFBUTtJQWV0RCxZQUNVLGNBQXVDLEVBQ3ZDLEtBQWEsRUFDdEIsU0FBc0IsRUFDUCxZQUEyQjtRQUUxQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7UUFMVixtQkFBYyxHQUFkLGNBQWMsQ0FBeUI7UUFDdkMsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQWJmLDJCQUFzQixHQUF5QyxFQUFFLENBQUE7UUFDakUsV0FBTSxHQUFHLENBQUMsQ0FBQTtRQWlCakIsSUFBSSxD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