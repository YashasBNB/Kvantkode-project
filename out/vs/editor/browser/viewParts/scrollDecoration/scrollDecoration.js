/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './scrollDecoration.css';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { ViewPart } from '../../view/viewPart.js';
export class ScrollDecorationViewPart extends ViewPart {
    constructor(context) {
        super(context);
        this._scrollTop = 0;
        this._width = 0;
        this._updateWidth();
        this._shouldShow = false;
        const options = this._context.configuration.options;
        const scrollbar = options.get(108 /* EditorOption.scrollbar */);
        this._useShadows = scrollbar.useShadows;
        this._domNode = createFastDomNode(document.createElement('div'));
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.setAttribute('aria-hidden', 'true');
    }
    dispose() {
        super.dispose();
    }
    _updateShouldShow() {
        const newShouldShow = this._useShadows && this._scrollTop > 0;
        if (this._shouldShow !== newShouldShow) {
            this._shouldShow = newShouldShow;
            return true;
        }
        return false;
    }
    getDomNode() {
        return this._domNode;
    }
    _updateWidth() {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        if (layoutInfo.minimap.renderMinimap === 0 ||
            (layoutInfo.minimap.minimapWidth > 0 && layoutInfo.minimap.minimapLeft === 0)) {
            this._width = layoutInfo.width;
        }
        else {
            this._width = layoutInfo.width - layoutInfo.verticalScrollbarWidth;
        }
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const scrollbar = options.get(108 /* EditorOption.scrollbar */);
        this._useShadows = scrollbar.useShadows;
        this._updateWidth();
        this._updateShouldShow();
        return true;
    }
    onScrollChanged(e) {
        this._scrollTop = e.scrollTop;
        return this._updateShouldShow();
    }
    // --- end event handlers
    prepareRender(ctx) {
        // Nothing to read
    }
    render(ctx) {
        this._domNode.setWidth(this._width);
        this._domNode.setClassName(this._shouldShow ? 'scroll-decoration' : '');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsRGVjb3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9zY3JvbGxEZWNvcmF0aW9uL3Njcm9sbERlY29yYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFNakQsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFFBQVE7SUFPckQsWUFBWSxPQUFvQjtRQUMvQixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFZCxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUNuQixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNmLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNuQixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtRQUN4QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUFDbkQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXdCLENBQUE7UUFDckQsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxRQUFRLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVlLE9BQU87UUFDdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUM3RCxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssYUFBYSxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUE7WUFDaEMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVPLFlBQVk7UUFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBQ25ELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLG1DQUF5QixDQUFBO1FBRXZELElBQ0MsVUFBVSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEtBQUssQ0FBQztZQUN0QyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsWUFBWSxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUMsRUFDNUUsQ0FBQztZQUNGLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQTtRQUMvQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsc0JBQXNCLENBQUE7UUFDbkUsQ0FBQztJQUNGLENBQUM7SUFFRCwyQkFBMkI7SUFFWCxzQkFBc0IsQ0FBQyxDQUEyQztRQUNqRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUFDbkQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXdCLENBQUE7UUFDckQsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNuQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN4QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDZSxlQUFlLENBQUMsQ0FBb0M7UUFDbkUsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQzdCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUVELHlCQUF5QjtJQUVsQixhQUFhLENBQUMsR0FBcUI7UUFDekMsa0JBQWtCO0lBQ25CLENBQUM7SUFFTSxNQUFNLENBQUMsR0FBK0I7UUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0NBQ0QifQ==