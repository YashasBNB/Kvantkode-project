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
import { ContextView, } from '../../../base/browser/ui/contextview/contextview.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
import { getWindow } from '../../../base/browser/dom.js';
let ContextViewHandler = class ContextViewHandler extends Disposable {
    constructor(layoutService) {
        super();
        this.layoutService = layoutService;
        this.contextView = this._register(new ContextView(this.layoutService.mainContainer, 1 /* ContextViewDOMPosition.ABSOLUTE */));
        this.layout();
        this._register(layoutService.onDidLayoutContainer(() => this.layout()));
    }
    // ContextView
    showContextView(delegate, container, shadowRoot) {
        let domPosition;
        if (container) {
            if (container === this.layoutService.getContainer(getWindow(container))) {
                domPosition = 1 /* ContextViewDOMPosition.ABSOLUTE */;
            }
            else if (shadowRoot) {
                domPosition = 3 /* ContextViewDOMPosition.FIXED_SHADOW */;
            }
            else {
                domPosition = 2 /* ContextViewDOMPosition.FIXED */;
            }
        }
        else {
            domPosition = 1 /* ContextViewDOMPosition.ABSOLUTE */;
        }
        this.contextView.setContainer(container ?? this.layoutService.activeContainer, domPosition);
        this.contextView.show(delegate);
        const openContextView = {
            close: () => {
                if (this.openContextView === openContextView) {
                    this.hideContextView();
                }
            },
        };
        this.openContextView = openContextView;
        return openContextView;
    }
    layout() {
        this.contextView.layout();
    }
    hideContextView(data) {
        this.contextView.hide(data);
        this.openContextView = undefined;
    }
};
ContextViewHandler = __decorate([
    __param(0, ILayoutService)
], ContextViewHandler);
export { ContextViewHandler };
export class ContextViewService extends ContextViewHandler {
    getContextViewElement() {
        return this.contextView.getViewElement();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dFZpZXdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29udGV4dHZpZXcvYnJvd3Nlci9jb250ZXh0Vmlld1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFdBQVcsR0FHWCxNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWpELElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUlqRCxZQUE2QyxhQUE2QjtRQUN6RSxLQUFLLEVBQUUsQ0FBQTtRQURxQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFHekUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNoQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsMENBQWtDLENBQ2xGLENBQUE7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDYixJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFFRCxjQUFjO0lBRWQsZUFBZSxDQUNkLFFBQThCLEVBQzlCLFNBQXVCLEVBQ3ZCLFVBQW9CO1FBRXBCLElBQUksV0FBbUMsQ0FBQTtRQUN2QyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxTQUFTLEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDekUsV0FBVywwQ0FBa0MsQ0FBQTtZQUM5QyxDQUFDO2lCQUFNLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ3ZCLFdBQVcsOENBQXNDLENBQUE7WUFDbEQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFdBQVcsdUNBQStCLENBQUE7WUFDM0MsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsV0FBVywwQ0FBa0MsQ0FBQTtRQUM5QyxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRTNGLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRS9CLE1BQU0sZUFBZSxHQUFxQjtZQUN6QyxLQUFLLEVBQUUsR0FBRyxFQUFFO2dCQUNYLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxlQUFlLEVBQUUsQ0FBQztvQkFDOUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO2dCQUN2QixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUE7UUFFRCxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtRQUN0QyxPQUFPLGVBQWUsQ0FBQTtJQUN2QixDQUFDO0lBRUQsTUFBTTtRQUNMLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELGVBQWUsQ0FBQyxJQUFVO1FBQ3pCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzNCLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO0lBQ2pDLENBQUM7Q0FDRCxDQUFBO0FBM0RZLGtCQUFrQjtJQUlqQixXQUFBLGNBQWMsQ0FBQTtHQUpmLGtCQUFrQixDQTJEOUI7O0FBRUQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLGtCQUFrQjtJQUd6RCxxQkFBcUI7UUFDcEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQ3pDLENBQUM7Q0FDRCJ9