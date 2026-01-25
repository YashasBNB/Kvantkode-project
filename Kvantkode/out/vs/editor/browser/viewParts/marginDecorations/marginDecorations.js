/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './marginDecorations.css';
import { DecorationToRender, DedupOverlay } from '../glyphMargin/glyphMargin.js';
export class MarginViewLineDecorationsOverlay extends DedupOverlay {
    constructor(context) {
        super();
        this._context = context;
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
            const marginClassName = d.options.marginClassName;
            const zIndex = d.options.zIndex;
            if (marginClassName) {
                r[rLen++] = new DecorationToRender(d.range.startLineNumber, d.range.endLineNumber, marginClassName, null, zIndex);
            }
        }
        return r;
    }
    prepareRender(ctx) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const toRender = this._render(visibleStartLineNumber, visibleEndLineNumber, this._getDecorations(ctx));
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            const decorations = toRender[lineIndex].getDecorations();
            let lineOutput = '';
            for (const decoration of decorations) {
                lineOutput += '<div class="cmdr ' + decoration.className + '" style=""></div>';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyZ2luRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9tYXJnaW5EZWNvcmF0aW9ucy9tYXJnaW5EZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUtoRixNQUFNLE9BQU8sZ0NBQWlDLFNBQVEsWUFBWTtJQUlqRSxZQUFZLE9BQW9CO1FBQy9CLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFDdkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7UUFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtRQUN6QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVELDJCQUEyQjtJQUVYLHNCQUFzQixDQUFDLENBQTJDO1FBQ2pGLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLG9CQUFvQixDQUFDLENBQXlDO1FBQzdFLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLFNBQVMsQ0FBQyxDQUE4QjtRQUN2RCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDZSxjQUFjLENBQUMsQ0FBbUM7UUFDakUsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ2UsY0FBYyxDQUFDLENBQW1DO1FBQ2pF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