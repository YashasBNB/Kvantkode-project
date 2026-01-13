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
import { getWindow } from '../../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { IThemeService, Themable } from '../../../../../platform/theme/common/themeService.js';
import { NotebookOverviewRulerLane } from '../notebookBrowser.js';
let NotebookOverviewRuler = class NotebookOverviewRuler extends Themable {
    constructor(notebookEditor, container, themeService) {
        super(themeService);
        this.notebookEditor = notebookEditor;
        this._lanes = 3;
        this._domNode = createFastDomNode(document.createElement('canvas'));
        this._domNode.setPosition('relative');
        this._domNode.setLayerHinting(true);
        this._domNode.setContain('strict');
        container.appendChild(this._domNode.domNode);
        this._register(notebookEditor.onDidChangeDecorations(() => {
            this.layout();
        }));
        this._register(PixelRatio.getInstance(getWindow(this._domNode.domNode)).onDidChange(() => {
            this.layout();
        }));
    }
    layout() {
        const width = 10;
        const layoutInfo = this.notebookEditor.getLayoutInfo();
        const scrollHeight = layoutInfo.scrollHeight;
        const height = layoutInfo.height;
        const ratio = PixelRatio.getInstance(getWindow(this._domNode.domNode)).value;
        this._domNode.setWidth(width);
        this._domNode.setHeight(height);
        this._domNode.domNode.width = width * ratio;
        this._domNode.domNode.height = height * ratio;
        const ctx = this._domNode.domNode.getContext('2d');
        ctx.clearRect(0, 0, width * ratio, height * ratio);
        this._render(ctx, width * ratio, height * ratio, scrollHeight * ratio, ratio);
    }
    _render(ctx, width, height, scrollHeight, ratio) {
        const viewModel = this.notebookEditor.getViewModel();
        const fontInfo = this.notebookEditor.getLayoutInfo().fontInfo;
        const laneWidth = width / this._lanes;
        let currentFrom = 0;
        if (viewModel) {
            for (let i = 0; i < viewModel.viewCells.length; i++) {
                const viewCell = viewModel.viewCells[i];
                const textBuffer = viewCell.textBuffer;
                const decorations = viewCell.getCellDecorations();
                const cellHeight = (viewCell.layoutInfo.totalHeight / scrollHeight) * ratio * height;
                decorations
                    .filter((decoration) => decoration.overviewRuler)
                    .forEach((decoration) => {
                    const overviewRuler = decoration.overviewRuler;
                    const fillStyle = this.getColor(overviewRuler.color) ?? '#000000';
                    const lineHeight = Math.min(fontInfo.lineHeight, (viewCell.layoutInfo.editorHeight / scrollHeight / textBuffer.getLineCount()) *
                        ratio *
                        height);
                    const lineNumbers = overviewRuler.modelRanges
                        .map((range) => range.startLineNumber)
                        .reduce((previous, current) => {
                        if (previous.length === 0) {
                            previous.push(current);
                        }
                        else {
                            const last = previous[previous.length - 1];
                            if (last !== current) {
                                previous.push(current);
                            }
                        }
                        return previous;
                    }, []);
                    let x = 0;
                    switch (overviewRuler.position) {
                        case NotebookOverviewRulerLane.Left:
                            x = 0;
                            break;
                        case NotebookOverviewRulerLane.Center:
                            x = laneWidth;
                            break;
                        case NotebookOverviewRulerLane.Right:
                            x = laneWidth * 2;
                            break;
                        default:
                            break;
                    }
                    const width = overviewRuler.position === NotebookOverviewRulerLane.Full ? laneWidth * 3 : laneWidth;
                    for (let i = 0; i < lineNumbers.length; i++) {
                        ctx.fillStyle = fillStyle;
                        const lineNumber = lineNumbers[i];
                        const offset = (lineNumber - 1) * lineHeight;
                        ctx.fillRect(x, currentFrom + offset, width, lineHeight);
                    }
                    if (overviewRuler.includeOutput) {
                        ctx.fillStyle = fillStyle;
                        const outputOffset = (viewCell.layoutInfo.editorHeight / scrollHeight) * ratio * height;
                        const decorationHeight = (fontInfo.lineHeight / scrollHeight) * ratio * height;
                        ctx.fillRect(laneWidth, currentFrom + outputOffset, laneWidth, decorationHeight);
                    }
                });
                currentFrom += cellHeight;
            }
            const overviewRulerDecorations = viewModel.getOverviewRulerDecorations();
            for (let i = 0; i < overviewRulerDecorations.length; i++) {
                const decoration = overviewRulerDecorations[i];
                if (!decoration.options.overviewRuler) {
                    continue;
                }
                const viewZoneInfo = this.notebookEditor.getViewZoneLayoutInfo(decoration.viewZoneId);
                if (!viewZoneInfo) {
                    continue;
                }
                const fillStyle = this.getColor(decoration.options.overviewRuler.color) ?? '#000000';
                let x = 0;
                switch (decoration.options.overviewRuler.position) {
                    case NotebookOverviewRulerLane.Left:
                        x = 0;
                        break;
                    case NotebookOverviewRulerLane.Center:
                        x = laneWidth;
                        break;
                    case NotebookOverviewRulerLane.Right:
                        x = laneWidth * 2;
                        break;
                    default:
                        break;
                }
                const width = decoration.options.overviewRuler.position === NotebookOverviewRulerLane.Full
                    ? laneWidth * 3
                    : laneWidth;
                ctx.fillStyle = fillStyle;
                const viewZoneHeight = (viewZoneInfo.height / scrollHeight) * ratio * height;
                const viewZoneTop = (viewZoneInfo.top / scrollHeight) * ratio * height;
                ctx.fillRect(x, viewZoneTop, width, viewZoneHeight);
            }
        }
    }
};
NotebookOverviewRuler = __decorate([
    __param(2, IThemeService)
], NotebookOverviewRuler);
export { NotebookOverviewRuler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdmVydmlld1J1bGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdQYXJ0cy9ub3RlYm9va092ZXJ2aWV3UnVsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBZSxNQUFNLDRDQUE0QyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlGLE9BQU8sRUFBMkIseUJBQXlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVuRixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFFBQVE7SUFJbEQsWUFDVSxjQUF1QyxFQUNoRCxTQUFzQixFQUNQLFlBQTJCO1FBRTFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUpWLG1CQUFjLEdBQWQsY0FBYyxDQUF5QjtRQUh6QyxXQUFNLEdBQUcsQ0FBQyxDQUFBO1FBUWpCLElBQUksQ0FBQyxRQUFRLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxD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