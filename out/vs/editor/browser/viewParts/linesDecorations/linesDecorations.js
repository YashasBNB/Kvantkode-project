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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9saW5lc0RlY29yYXRpb25zL2xpbmVzRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFNaEYsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFlBQVk7SUFPeEQsWUFBWSxPQUFvQjtRQUMvQixLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNuRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQTtRQUN2RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQTtRQUNsRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFBO1FBQ3BELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7UUFDekIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCwyQkFBMkI7SUFFWCxzQkFBc0IsQ0FBQyxDQUEyQztRQUNqRixNQUFNLE9BQU8s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