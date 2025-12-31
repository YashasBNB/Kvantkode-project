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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdmVydmlld1J1bGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3UGFydHMvbm90ZWJvb2tPdmVydmlld1J1bGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM5RixPQUFPLEVBQTJCLHlCQUF5QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFbkYsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxRQUFRO0lBSWxELFlBQ1UsY0FBdUMsRUFDaEQsU0FBc0IsRUFDUCxZQUEyQjtRQUUxQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7UUFKVixtQkFBYyxHQUFkLGNBQWMsQ0FBeUI7UUFIekMsV0FBTSxHQUFHLENBQUMsQ0FBQTtRQVFqQixJQUFJLENBQUMsUUFBUSxHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVsQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFNUMsSUFBSSxDQUFDLFNBQVMsQ0FDYixjQUFjLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFO1lBQzFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLFVBQVUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ3pFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsTUFBTTtRQUNMLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQTtRQUNoQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3RELE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUE7UUFDNUMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQTtRQUNoQyxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1FBQzVFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQzNDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQzdDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQTtRQUNuRCxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBRSxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBRSxNQUFNLEdBQUcsS0FBSyxFQUFFLFlBQVksR0FBRyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDOUUsQ0FBQztJQUVPLE9BQU8sQ0FDZCxHQUE2QixFQUM3QixLQUFhLEVBQ2IsTUFBYyxFQUNkLFlBQW9CLEVBQ3BCLEtBQWE7UUFFYixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3BELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxDQUFBO1FBQzdELE1BQU0sU0FBUyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBRXJDLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtRQUVuQixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3JELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZDLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUE7Z0JBQ3RDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO2dCQUNqRCxNQUFNLFVBQVUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxHQUFHLEtBQUssR0FBRyxNQUFNLENBQUE7Z0JBRXBGLFdBQVc7cUJBQ1QsTUFBTSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO3FCQUNoRCxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtvQkFDdkIsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLGFBQWMsQ0FBQTtvQkFDL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksU0FBUyxDQUFBO29CQUNqRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUMxQixRQUFRLENBQUMsVUFBVSxFQUNuQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsWUFBWSxHQUFHLFlBQVksR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUM7d0JBQzVFLEtBQUs7d0JBQ0wsTUFBTSxDQUNQLENBQUE7b0JBQ0QsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLFdBQVc7eUJBQzNDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQzt5QkFDckMsTUFBTSxDQUFDLENBQUMsUUFBa0IsRUFBRSxPQUFlLEVBQUUsRUFBRTt3QkFDL0MsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDOzRCQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO3dCQUN2QixDQUFDOzZCQUFNLENBQUM7NEJBQ1AsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7NEJBQzFDLElBQUksSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dDQUN0QixRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBOzRCQUN2QixDQUFDO3dCQUNGLENBQUM7d0JBRUQsT0FBTyxRQUFRLENBQUE7b0JBQ2hCLENBQUMsRUFBRSxFQUFjLENBQUMsQ0FBQTtvQkFFbkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUNULFFBQVEsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUNoQyxLQUFLLHlCQUF5QixDQUFDLElBQUk7NEJBQ2xDLENBQUMsR0FBRyxDQUFDLENBQUE7NEJBQ0wsTUFBSzt3QkFDTixLQUFLLHlCQUF5QixDQUFDLE1BQU07NEJBQ3BDLENBQUMsR0FBRyxTQUFTLENBQUE7NEJBQ2IsTUFBSzt3QkFDTixLQUFLLHlCQUF5QixDQUFDLEtBQUs7NEJBQ25DLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxDQUFBOzRCQUNqQixNQUFLO3dCQUNOOzRCQUNDLE1BQUs7b0JBQ1AsQ0FBQztvQkFFRCxNQUFNLEtBQUssR0FDVixhQUFhLENBQUMsUUFBUSxLQUFLLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO29CQUV0RixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUM3QyxHQUFHLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTt3QkFDekIsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO3dCQUNqQyxNQUFNLE1BQU0sR0FBRyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUE7d0JBQzVDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFdBQVcsR0FBRyxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO29CQUN6RCxDQUFDO29CQUVELElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDO3dCQUNqQyxHQUFHLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTt3QkFDekIsTUFBTSxZQUFZLEdBQ2pCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQTt3QkFDbkUsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQTt3QkFDOUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsV0FBVyxHQUFHLFlBQVksRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtvQkFDakYsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQTtnQkFFSCxXQUFXLElBQUksVUFBVSxDQUFBO1lBQzFCLENBQUM7WUFFRCxNQUFNLHdCQUF3QixHQUFHLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSxDQUFBO1lBRXhFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDMUQsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzlDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUN2QyxTQUFRO2dCQUNULENBQUM7Z0JBQ0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBRXJGLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDbkIsU0FBUTtnQkFDVCxDQUFDO2dCQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksU0FBUyxDQUFBO2dCQUNwRixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ1QsUUFBUSxVQUFVLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDbkQsS0FBSyx5QkFBeUIsQ0FBQyxJQUFJO3dCQUNsQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO3dCQUNMLE1BQUs7b0JBQ04sS0FBSyx5QkFBeUIsQ0FBQyxNQUFNO3dCQUNwQyxDQUFDLEdBQUcsU0FBUyxDQUFBO3dCQUNiLE1BQUs7b0JBQ04sS0FBSyx5QkFBeUIsQ0FBQyxLQUFLO3dCQUNuQyxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsQ0FBQTt3QkFDakIsTUFBSztvQkFDTjt3QkFDQyxNQUFLO2dCQUNQLENBQUM7Z0JBRUQsTUFBTSxLQUFLLEdBQ1YsVUFBVSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxLQUFLLHlCQUF5QixDQUFDLElBQUk7b0JBQzNFLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQztvQkFDZixDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUViLEdBQUcsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO2dCQUV6QixNQUFNLGNBQWMsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQTtnQkFDNUUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLEtBQUssR0FBRyxNQUFNLENBQUE7Z0JBRXRFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFDcEQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTNLWSxxQkFBcUI7SUFPL0IsV0FBQSxhQUFhLENBQUE7R0FQSCxxQkFBcUIsQ0EyS2pDIn0=