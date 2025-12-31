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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VudGVyZWRWaWV3TGF5b3V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2NlbnRlcmVkL2NlbnRlcmVkVmlld0xheW91dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUF3QixNQUFNLGNBQWMsQ0FBQTtBQUd0RCxPQUFPLEVBS04sU0FBUyxHQUNULE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQTtBQVczRSxNQUFNLFlBQVksR0FBc0I7SUFDdkMsV0FBVyxFQUFFLEdBQUc7SUFDaEIsZUFBZSxFQUFFLE1BQU07SUFDdkIsZ0JBQWdCLEVBQUUsTUFBTTtDQUN4QixDQUFBO0FBRUQsTUFBTSxnQkFBZ0IsR0FBcUIsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLENBQUE7QUFFakUsU0FBUyxlQUFlLENBQ3ZCLFVBQTZCO0lBRTdCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzVDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtJQUM3QixJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN0RCxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU87UUFDUCxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztRQUN2QixXQUFXLEVBQUUsRUFBRTtRQUNmLFdBQVcsRUFBRSxNQUFNLENBQUMsaUJBQWlCO1FBQ3JDLFdBQVcsRUFBRSxLQUFLLENBQUMsSUFBSTtLQUN2QixDQUFBO0FB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