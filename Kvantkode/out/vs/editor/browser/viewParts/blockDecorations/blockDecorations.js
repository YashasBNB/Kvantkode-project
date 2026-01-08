/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import './blockDecorations.css';
import { ViewPart } from '../../view/viewPart.js';
export class BlockDecorations extends ViewPart {
    constructor(context) {
        super(context);
        this.blocks = [];
        this.contentWidth = -1;
        this.contentLeft = 0;
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setAttribute('role', 'presentation');
        this.domNode.setAttribute('aria-hidden', 'true');
        this.domNode.setClassName('blockDecorations-container');
        this.update();
    }
    update() {
        let didChange = false;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const newContentWidth = layoutInfo.contentWidth - layoutInfo.verticalScrollbarWidth;
        if (this.contentWidth !== newContentWidth) {
            this.contentWidth = newContentWidth;
            didChange = true;
        }
        const newContentLeft = layoutInfo.contentLeft;
        if (this.contentLeft !== newContentLeft) {
            this.contentLeft = newContentLeft;
            didChange = true;
        }
        return didChange;
    }
    dispose() {
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        return this.update();
    }
    onScrollChanged(e) {
        return e.scrollTopChanged || e.scrollLeftChanged;
    }
    onDecorationsChanged(e) {
        return true;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        // Nothing to read
    }
    render(ctx) {
        let count = 0;
        const decorations = ctx.getDecorationsInViewport();
        for (const decoration of decorations) {
            if (!decoration.options.blockClassName) {
                continue;
            }
            let block = this.blocks[count];
            if (!block) {
                block = this.blocks[count] = createFastDomNode(document.createElement('div'));
                this.domNode.appendChild(block);
            }
            let top;
            let bottom;
            if (decoration.options.blockIsAfterEnd) {
                // range must be empty
                top = ctx.getVerticalOffsetAfterLineNumber(decoration.range.endLineNumber, false);
                bottom = ctx.getVerticalOffsetAfterLineNumber(decoration.range.endLineNumber, true);
            }
            else {
                top = ctx.getVerticalOffsetForLineNumber(decoration.range.startLineNumber, true);
                bottom =
                    decoration.range.isEmpty() && !decoration.options.blockDoesNotCollapse
                        ? ctx.getVerticalOffsetForLineNumber(decoration.range.startLineNumber, false)
                        : ctx.getVerticalOffsetAfterLineNumber(decoration.range.endLineNumber, true);
            }
            const [paddingTop, paddingRight, paddingBottom, paddingLeft] = decoration.options
                .blockPadding ?? [0, 0, 0, 0];
            block.setClassName('blockDecorations-block ' + decoration.options.blockClassName);
            block.setLeft(this.contentLeft - paddingLeft);
            block.setWidth(this.contentWidth + paddingLeft + paddingRight);
            block.setTop(top - ctx.scrollTop - paddingTop);
            block.setHeight(bottom - top + paddingTop + paddingBottom);
            count++;
        }
        for (let i = count; i < this.blocks.length; i++) {
            this.blocks[i].domNode.remove();
        }
        this.blocks.length = count;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxvY2tEZWNvcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL2Jsb2NrRGVjb3JhdGlvbnMvYmxvY2tEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RixPQUFPLHdCQUF3QixDQUFBO0FBRS9CLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUtqRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsUUFBUTtJQVE3QyxZQUFZLE9BQW9CO1FBQy9CLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQU5FLFdBQU0sR0FBK0IsRUFBRSxDQUFBO1FBRWhELGlCQUFZLEdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDekIsZ0JBQVcsR0FBVyxDQUFDLENBQUE7UUFLOUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxpQkFBaUIsQ0FBYyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDNUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ2pELElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBRXZELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNkLENBQUM7SUFFTyxNQUFNO1FBQ2IsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFBO1FBQ3JCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNu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