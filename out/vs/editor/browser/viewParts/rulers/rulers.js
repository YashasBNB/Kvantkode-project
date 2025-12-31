/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './rulers.css';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { ViewPart } from '../../view/viewPart.js';
/**
 * Rulers are vertical lines that appear at certain columns in the editor. There can be >= 0 rulers
 * at a time.
 */
export class Rulers extends ViewPart {
    constructor(context) {
        super(context);
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setAttribute('role', 'presentation');
        this.domNode.setAttribute('aria-hidden', 'true');
        this.domNode.setClassName('view-rulers');
        this._renderedRulers = [];
        const options = this._context.configuration.options;
        this._rulers = options.get(107 /* EditorOption.rulers */);
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
    }
    dispose() {
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        this._rulers = options.get(107 /* EditorOption.rulers */);
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        return true;
    }
    onScrollChanged(e) {
        return e.scrollHeightChanged;
    }
    // --- end event handlers
    prepareRender(ctx) {
        // Nothing to read
    }
    _ensureRulersCount() {
        const currentCount = this._renderedRulers.length;
        const desiredCount = this._rulers.length;
        if (currentCount === desiredCount) {
            // Nothing to do
            return;
        }
        if (currentCount < desiredCount) {
            const { tabSize } = this._context.viewModel.model.getOptions();
            const rulerWidth = tabSize;
            let addCount = desiredCount - currentCount;
            while (addCount > 0) {
                const node = createFastDomNode(document.createElement('div'));
                node.setClassName('view-ruler');
                node.setWidth(rulerWidth);
                this.domNode.appendChild(node);
                this._renderedRulers.push(node);
                addCount--;
            }
            return;
        }
        let removeCount = currentCount - desiredCount;
        while (removeCount > 0) {
            const node = this._renderedRulers.pop();
            this.domNode.removeChild(node);
            removeCount--;
        }
    }
    render(ctx) {
        this._ensureRulersCount();
        for (let i = 0, len = this._rulers.length; i < len; i++) {
            const node = this._renderedRulers[i];
            const ruler = this._rulers[i];
            node.setBoxShadow(ruler.color ? `1px 0 0 0 ${ruler.color} inset` : ``);
            node.setHeight(Math.min(ctx.scrollHeight, 1000000));
            node.setLeft(ruler.column * this._typicalHalfwidthCharacterWidth);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3J1bGVycy9ydWxlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBTWpEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxNQUFPLFNBQVEsUUFBUTtJQU1uQyxZQUFZLE9BQW9CO1FBQy9CLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsaUJBQWlCLENBQWMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzVFLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUNqRCxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUE7UUFDekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBQ25ELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsK0JBQXFCLENBQUE7UUFDL0MsSUFBSSxDQUFDLCtCQUErQixHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUVqRCxDQUFDLDhCQUE4QixDQUFBO0lBQ2pDLENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRUQsMkJBQTJCO0lBRVgsc0JBQXNCLENBQUMsQ0FBMkM7UUFDakYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBQ25ELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsK0JBQXFCLENBQUE7UUFDL0MsSUFBSSxDQUFDLCtCQUErQixHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUVqRCxDQUFDLDhCQUE4QixDQUFBO1FBQ2hDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLGVBQWUsQ0FBQyxDQUFvQztRQUNuRSxPQUFPLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQTtJQUM3QixDQUFDO0lBRUQseUJBQXlCO0lBRWxCLGFBQWEsQ0FBQyxHQUFxQjtRQUN6QyxrQkFBa0I7SUFDbkIsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQTtRQUNoRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUV4QyxJQUFJLFlBQVksS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUNuQyxnQkFBZ0I7WUFDaEIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLFlBQVksR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUNqQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQzlELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQTtZQUMxQixJQUFJLFFBQVEsR0FBRyxZQUFZLEdBQUcsWUFBWSxDQUFBO1lBQzFDLE9BQU8sUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNyQixNQUFNLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0JBQzdELElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUM5QixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDL0IsUUFBUSxFQUFFLENBQUE7WUFDWCxDQUFDO1lBQ0QsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLFdBQVcsR0FBRyxZQUFZLEdBQUcsWUFBWSxDQUFBO1FBQzdDLE9BQU8sV0FBVyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFHLENBQUE7WUFDeEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDOUIsV0FBVyxFQUFFLENBQUE7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxHQUErQjtRQUM1QyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUV6QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUU3QixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGFBQWEsS0FBSyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN0RSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQTtRQUNsRSxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=