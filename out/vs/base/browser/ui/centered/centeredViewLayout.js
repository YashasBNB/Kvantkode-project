/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $ } from '../../dom.js';
import { SplitView, } from '../splitview/splitview.js';
import { Event } from '../../../common/event.js';
import { DisposableStore } from '../../../common/lifecycle.js';
const defaultState = {
    targetWidth: 900,
    leftMarginRatio: 0.1909,
    rightMarginRatio: 0.1909,
};
const distributeSizing = { type: 'distribute' };
function createEmptyView(background) {
    const element = $('.centered-layout-margin');
    element.style.height = '100%';
    if (background) {
        element.style.backgroundColor = background.toString();
    }
    return {
        element,
        layout: () => undefined,
        minimumSize: 60,
        maximumSize: Number.POSITIVE_INFINITY,
        onDidChange: Event.None,
    };
}
function toSplitViewView(view, getHeight) {
    return {
        element: view.element,
        get maximumSize() {
            return view.maximumWidth;
        },
        get minimumSize() {
            return view.minimumWidth;
        },
        onDidChange: Event.map(view.onDidChange, (e) => e && e.width),
        layout: (size, offset, ctx) => view.layout(size, getHeight(), ctx?.top ?? 0, (ctx?.left ?? 0) + offset),
    };
}
export class CenteredViewLayout {
    constructor(container, view, state = { ...defaultState }, centeredLayoutFixedWidth = false) {
        this.container = container;
        this.view = view;
        this.state = state;
        this.centeredLayoutFixedWidth = centeredLayoutFixedWidth;
        this.lastLayoutPosition = { width: 0, height: 0, left: 0, top: 0 };
        this.didLayout = false;
        this.splitViewDisposables = new DisposableStore();
        this._boundarySashes = {};
        this.container.appendChild(this.view.element);
        // Make sure to hide the split view overflow like sashes #52892
        this.container.style.overflow = 'hidden';
    }
    get minimumWidth() {
        return this.splitView ? this.splitView.minimumSize : this.view.minimumWidth;
    }
    get maximumWidth() {
        return this.splitView ? this.splitView.maximumSize : this.view.maximumWidth;
    }
    get minimumHeight() {
        return this.view.minimumHeight;
    }
    get maximumHeight() {
        return this.view.maximumHeight;
    }
    get onDidChange() {
        return this.view.onDidChange;
    }
    get boundarySashes() {
        return this._boundarySashes;
    }
    set boundarySashes(boundarySashes) {
        this._boundarySashes = boundarySashes;
        if (!this.splitView) {
            return;
        }
        this.splitView.orthogonalStartSash = boundarySashes.top;
        this.splitView.orthogonalEndSash = boundarySashes.bottom;
    }
    layout(width, height, top, left) {
        this.lastLayoutPosition = { width, height, top, left };
        if (this.splitView) {
            this.splitView.layout(width, this.lastLayoutPosition);
            if (!this.didLayout || this.centeredLayoutFixedWidth) {
                this.resizeSplitViews();
            }
        }
        else {
            this.view.layout(width, height, top, left);
        }
        this.didLayout = true;
    }
    resizeSplitViews() {
        if (!this.splitView) {
            return;
        }
        if (this.centeredLayoutFixedWidth) {
            const centerViewWidth = Math.min(this.lastLayoutPosition.width, this.state.targetWidth);
            const marginWidthFloat = (this.lastLayoutPosition.width - centerViewWidth) / 2;
            this.splitView.resizeView(0, Math.floor(marginWidthFloat));
            this.splitView.resizeView(1, centerViewWidth);
            this.splitView.resizeView(2, Math.ceil(marginWidthFloat));
        }
        else {
            const leftMargin = this.state.leftMarginRatio * this.lastLayoutPosition.width;
            const rightMargin = this.state.rightMarginRatio * this.lastLayoutPosition.width;
            const center = this.lastLayoutPosition.width - leftMargin - rightMargin;
            this.splitView.resizeView(0, leftMargin);
            this.splitView.resizeView(1, center);
            this.splitView.resizeView(2, rightMargin);
        }
    }
    setFixedWidth(option) {
        this.centeredLayoutFixedWidth = option;
        if (!!this.splitView) {
            this.updateState();
            this.resizeSplitViews();
        }
    }
    updateState() {
        if (!!this.splitView) {
            this.state.targetWidth = this.splitView.getViewSize(1);
            this.state.leftMarginRatio = this.splitView.getViewSize(0) / this.lastLayoutPosition.width;
            this.state.rightMarginRatio = this.splitView.getViewSize(2) / this.lastLayoutPosition.width;
        }
    }
    isActive() {
        return !!this.splitView;
    }
    styles(style) {
        this.style = style;
        if (this.splitView && this.emptyViews) {
            this.splitView.style(this.style);
            this.emptyViews[0].element.style.backgroundColor = this.style.background.toString();
            this.emptyViews[1].element.style.backgroundColor = this.style.background.toString();
        }
    }
    activate(active) {
        if (active === this.isActive()) {
            return;
        }
        if (active) {
            this.view.element.remove();
            this.splitView = new SplitView(this.container, {
                inverseAltBehavior: true,
                orientation: 1 /* Orientation.HORIZONTAL */,
                styles: this.style,
            });
            this.splitView.orthogonalStartSash = this.boundarySashes.top;
            this.splitView.orthogonalEndSash = this.boundarySashes.bottom;
            this.splitViewDisposables.add(this.splitView.onDidSashChange(() => {
                if (!!this.splitView) {
                    this.updateState();
                }
            }));
            this.splitViewDisposables.add(this.splitView.onDidSashReset(() => {
                this.state = { ...defaultState };
                this.resizeSplitViews();
            }));
            this.splitView.layout(this.lastLayoutPosition.width, this.lastLayoutPosition);
            const backgroundColor = this.style ? this.style.background : undefined;
            this.emptyViews = [createEmptyView(backgroundColor), createEmptyView(backgroundColor)];
            this.splitView.addView(this.emptyViews[0], distributeSizing, 0);
            this.splitView.addView(toSplitViewView(this.view, () => this.lastLayoutPosition.height), distributeSizing, 1);
            this.splitView.addView(this.emptyViews[1], distributeSizing, 2);
            this.resizeSplitViews();
        }
        else {
            this.splitView?.el.remove();
            this.splitViewDisposables.clear();
            this.splitView?.dispose();
            this.splitView = undefined;
            this.emptyViews = undefined;
            this.container.appendChild(this.view.element);
            this.view.layout(this.lastLayoutPosition.width, this.lastLayoutPosition.height, this.lastLayoutPosition.top, this.lastLayoutPosition.left);
        }
    }
    isDefault(state) {
        if (this.centeredLayoutFixedWidth) {
            return state.targetWidth === defaultState.targetWidth;
        }
        else {
            return (state.leftMarginRatio === defaultState.leftMarginRatio &&
                state.rightMarginRatio === defaultState.rightMarginRatio);
        }
    }
    dispose() {
        this.splitViewDisposables.dispose();
        if (this.splitView) {
            this.splitView.dispose();
            this.splitView = undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VudGVyZWRWaWV3TGF5b3V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvY2VudGVyZWQvY2VudGVyZWRWaWV3TGF5b3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQXdCLE1BQU0sY0FBYyxDQUFBO0FBR3RELE9BQU8sRUFLTixTQUFTLEdBQ1QsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLDhCQUE4QixDQUFBO0FBVzNFLE1BQU0sWUFBWSxHQUFzQjtJQUN2QyxXQUFXLEVBQUUsR0FBRztJQUNoQixlQUFlLEVBQUUsTUFBTTtJQUN2QixnQkFBZ0IsRUFBRSxNQUFNO0NBQ3hCLENBQUE7QUFFRCxNQUFNLGdCQUFnQixHQUFxQixFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsQ0FBQTtBQUVqRSxTQUFTLGVBQWUsQ0FDdkIsVUFBNkI7SUFFN0IsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDNUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO0lBQzdCLElBQUksVUFBVSxFQUFFLENBQUM7UUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3RELENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTztRQUNQLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO1FBQ3ZCLFdBQVcsRUFBRSxFQUFFO1FBQ2YsV0FBVyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7UUFDckMsV0FBVyxFQUFFLEtBQUssQ0FBQyxJQUFJO0tBQ3ZCLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQ3ZCLElBQVcsRUFDWCxTQUF1QjtJQUV2QixPQUFPO1FBQ04sT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1FBQ3JCLElBQUksV0FBVztZQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtRQUN6QixDQUFDO1FBQ0QsSUFBSSxXQUFXO1lBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBQ3pCLENBQUM7UUFDRCxXQUFXLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUM3RCxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUM7S0FDekUsQ0FBQTtBQUNGLENBQUM7QUFNRCxNQUFNLE9BQU8sa0JBQWtCO0lBUTlCLFlBQ1MsU0FBc0IsRUFDdEIsSUFBVyxFQUNaLFFBQTJCLEVBQUUsR0FBRyxZQUFZLEVBQUUsRUFDN0MsMkJBQW9DLEtBQUs7UUFIekMsY0FBUyxHQUFULFNBQVMsQ0FBYTtRQUN0QixTQUFJLEdBQUosSUFBSSxDQUFPO1FBQ1osVUFBSyxHQUFMLEtBQUssQ0FBeUM7UUFDN0MsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUFpQjtRQVYxQyx1QkFBa0IsR0FBeUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUE7UUFFbkYsY0FBUyxHQUFHLEtBQUssQ0FBQTtRQUVSLHlCQUFvQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUE2QnJELG9CQUFlLEdBQW9CLEVBQUUsQ0FBQTtRQXJCNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM3QywrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDNUUsQ0FBQztJQUNELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQzVFLENBQUM7SUFDRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMvQixDQUFDO0lBQ0QsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDL0IsQ0FBQztJQUNELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDN0IsQ0FBQztJQUdELElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUNELElBQUksY0FBYyxDQUFDLGNBQStCO1FBQ2pELElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFBO1FBRXJDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUE7UUFDdkQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFBO0lBQ3pELENBQUM7SUFFRCxNQUFNLENBQUMsS0FBYSxFQUFFLE1BQWMsRUFBRSxHQUFXLEVBQUUsSUFBWTtRQUM5RCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUN0RCxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7WUFDckQsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7Z0JBQ3RELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQ3hCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtJQUN0QixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ25DLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3ZGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM5RSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7WUFDMUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1lBQzdDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtRQUMxRCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7WUFDN0UsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO1lBQy9FLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsVUFBVSxHQUFHLFdBQVcsQ0FBQTtZQUN2RSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUMxQyxDQUFDO0lBQ0YsQ0FBQztJQUVELGFBQWEsQ0FBQyxNQUFlO1FBQzVCLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxNQUFNLENBQUE7UUFDdEMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUNsQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVPLFdBQVc7UUFDbEIsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RELElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7WUFDMUYsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO1FBQzVGLENBQUM7SUFDRixDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDeEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUEwQjtRQUNoQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNsQixJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNoQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ25GLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDcEYsQ0FBQztJQUNGLENBQUM7SUFFRCxRQUFRLENBQUMsTUFBZTtRQUN2QixJQUFJLE1BQU0sS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNoQyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUMxQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQzlDLGtCQUFrQixFQUFFLElBQUk7Z0JBQ3hCLFdBQVcsZ0NBQXdCO2dCQUNuQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUs7YUFDbEIsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQTtZQUM1RCxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFBO1lBRTdELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQzVCLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUN0QixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ25CLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFO2dCQUNsQyxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsR0FBRyxZQUFZLEVBQUUsQ0FBQTtnQkFDaEMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7WUFDeEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7WUFDN0UsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUN0RSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBO1lBRXRGLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQ3JCLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFDaEUsZ0JBQWdCLEVBQ2hCLENBQUMsQ0FDRCxDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUUvRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUN4QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQzNCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNqQyxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFBO1lBQ3pCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1lBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1lBQzNCLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQ2YsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFDN0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFDOUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FDNUIsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyxDQUFDLEtBQXdCO1FBQ2pDLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDbkMsT0FBTyxLQUFLLENBQUMsV0FBVyxLQUFLLFlBQVksQ0FBQyxXQUFXLENBQUE7UUFDdEQsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQ04sS0FBSyxDQUFDLGVBQWUsS0FBSyxZQUFZLENBQUMsZUFBZTtnQkFDdEQsS0FBSyxDQUFDLGdCQUFnQixLQUFLLFlBQVksQ0FBQyxnQkFBZ0IsQ0FDeEQsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVuQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3hCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBQzNCLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==