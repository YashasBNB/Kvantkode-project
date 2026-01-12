/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './linesDecorations.css';
import { DecorationToRender, DedupOverlay } from '../glyphMargin/glyphMargin.js';
export class LinesDecorationsOverlay extends DedupOverlay {
    constructor(context) {
        super();
        this._context = context;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._decorationsLeft = layoutInfo.decorationsLeft;
        this._decorationsWidth = layoutInfo.decorationsWidth;
        this._renderResult = null;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        this._renderResult = null;
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._decorationsLeft = layoutInfo.decorationsLeft;
        this._decorationsWidth = layoutInfo.decorationsWidth;
        return true;
    }
    onDecorationsChanged(e) {
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    _getDecorations(ctx) {
        const decorations = ctx.getDecorationsInViewport();
        const r = [];
        let rLen = 0;
        for (let i = 0, len = decorations.length; i < len; i++) {
            const d = decorations[i];
            const linesDecorationsClassName = d.options.linesDecorationsClassName;
            const zIndex = d.options.zIndex;
            if (linesDecorationsClassName) {
                r[rLen++] = new DecorationToRender(d.range.startLineNumber, d.range.endLineNumber, linesDecorationsClassName, d.options.linesDecorationsTooltip ?? null, zIndex);
            }
            const firstLineDecorationClassName = d.options.firstLineDecorationClassName;
            if (firstLineDecorationClassName) {
                r[rLen++] = new DecorationToRender(d.range.startLineNumber, d.range.startLineNumber, firstLineDecorationClassName, d.options.linesDecorationsTooltip ?? null, zIndex);
            }
        }
        return r;
    }
    prepareRender(ctx) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const toRender = this._render(visibleStartLineNumber, visibleEndLineNumber, this._getDecorations(ctx));
        const left = this._decorationsLeft.toString();
        const width = this._decorationsWidth.toString();
        const common = '" style="left:' + left + 'px;width:' + width + 'px;"></div>';
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            const decorations = toRender[lineIndex].getDecorations();
            let lineOutput = '';
            for (const decoration of decorations) {
                let addition = '<div class="cldr ' + decoration.className;
                if (decoration.tooltip !== null) {
                    addition += '" title="' + decoration.tooltip; // The tooltip is already escaped.
                }
                addition += common;
                lineOutput += addition;
            }
            output[lineIndex] = lineOutput;
        }
        this._renderResult = output;
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderResult) {
            return '';
        }
        return this._renderResult[lineNumber - startLineNumber];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL2xpbmVzRGVjb3JhdGlvbnMvbGluZXNEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQU1oRixNQUFNLE9BQU8sdUJBQXdCLFNBQVEsWUFBWTtJQU94RCxZQUFZLE9BQW9CO1FBQy9CLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFDdkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBQ25ELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLG1DQUF5QixDQUFBO1FBQ3ZELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsZUFBZSxDQUFBO1FBQ2xELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUE7UUFDcEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7UUFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtRQUN6QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVELDJCQUEyQjtJQUVYLHNCQUFzQixDQUFDLENBQTJDO1FBQ2pGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNuRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQTtRQUN2RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQTtRQUNsRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFBO1FBQ3BELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLG9CQUFvQixDQUFDLENBQXlDO1FBQzdFLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLFNBQVMsQ0FBQyxDQUE4QjtRQUN2RCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDZSxjQUFjLENBQUMsQ0FBbUM7UUFDakUsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ2UsY0FBYyxDQUFDLENBQW1DO1FBQ2pFLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLGVBQWUsQ0FBQyxDQUFvQztRQUNuRSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDZSxlQUFlLENBQUMsQ0FBb0M7UUFDbkUsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUE7SUFDMUIsQ0FBQztJQUNlLGNBQWMsQ0FBQyxDQUFtQztRQUNqRSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCx5QkFBeUI7SUFFZixlQUFlLENBQUMsR0FBcUI7UUFDOUMsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLHdCQUF3QixFQUFFLENBQUE7UUFDbEQsTUFBTSxDQUFDLEdBQXlCLEVBQUUsQ0FBQTtRQUNsQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUE7UUFDWixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDeEQsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQTtZQUNyRSxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQTtZQUMvQixJQUFJLHlCQUF5QixFQUFFLENBQUM7Z0JBQy9CLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksa0JBQWtCLENBQ2pDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUN2QixDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFDckIseUJBQXlCLEVBQ3pCLENBQUMsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLElBQUksSUFBSSxFQUN6QyxNQUFNLENBQ04sQ0FBQTtZQUNGLENBQUM7WUFDRCxNQUFNLDRCQUE0QixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUE7WUFDM0UsSUFBSSw0QkFBNEIsRUFBRSxDQUFDO2dCQUNsQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLGtCQUFrQixDQUNqQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDdkIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQ3ZCLDRCQUE0QixFQUM1QixDQUFDLENBQUMsT0FBTyxDQUFDLHVCQUF1QixJQUFJLElBQUksRUFDekMsTUFBTSxDQUNOLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQUVNLGFBQWEsQ0FBQyxHQUFxQjtRQUN6QyxNQUFNLHNCQUFzQixHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFBO1FBQy9ELE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUE7UUFDM0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FDNUIsc0JBQXNCLEVBQ3RCLG9CQUFvQixFQUNwQixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUN6QixDQUFBO1FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzdDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMvQyxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsV0FBVyxHQUFHLEtBQUssR0FBRyxhQUFhLENBQUE7UUFFNUUsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1FBQzNCLEtBQ0MsSUFBSSxVQUFVLEdBQUcsc0JBQXNCLEVBQ3ZDLFVBQVUsSUFBSSxvQkFBb0IsRUFDbEMsVUFBVSxFQUFFLEVBQ1gsQ0FBQztZQUNGLE1BQU0sU0FBUyxHQUFHLFVBQVUsR0FBRyxzQkFBc0IsQ0FBQTtZQUNyRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDeEQsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFBO1lBQ25CLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksUUFBUSxHQUFHLG1CQUFtQixHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUE7Z0JBQ3pELElBQUksVUFBVSxDQUFDLE9BQU8sS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDakMsUUFBUSxJQUFJLFdBQVcsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFBLENBQUMsa0NBQWtDO2dCQUNoRixDQUFDO2dCQUNELFFBQVEsSUFBSSxNQUFNLENBQUE7Z0JBQ2xCLFVBQVUsSUFBSSxRQUFRLENBQUE7WUFDdkIsQ0FBQztZQUNELE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxVQUFVLENBQUE7UUFDL0IsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFBO0lBQzVCLENBQUM7SUFFTSxNQUFNLENBQUMsZUFBdUIsRUFBRSxVQUFrQjtRQUN4RCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEdBQUcsZUFBZSxDQUFDLENBQUE7SUFDeEQsQ0FBQztDQUNEIn0=