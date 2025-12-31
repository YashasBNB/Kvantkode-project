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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxvY2tEZWNvcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9ibG9ja0RlY29yYXRpb25zL2Jsb2NrRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDeEYsT0FBTyx3QkFBd0IsQ0FBQTtBQUUvQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFLakQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFFBQVE7SUFRN0MsWUFBWSxPQUFvQjtRQUMvQixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFORSxXQUFNLEdBQStCLEVBQUUsQ0FBQTtRQUVoRCxpQkFBWSxHQUFXLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLGdCQUFXLEdBQVcsQ0FBQyxDQUFBO1FBSzlCLElBQUksQ0FBQyxPQUFPLEdBQUcsaUJBQWlCLENBQWMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzVFLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUNqRCxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtRQUV2RCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDZCxDQUFDO0lBRU8sTUFBTTtRQUNiLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUNyQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUFDbkQsTUFB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