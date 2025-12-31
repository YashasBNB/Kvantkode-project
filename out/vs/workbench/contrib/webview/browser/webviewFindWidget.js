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
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { SimpleFindWidget } from '../../codeEditor/browser/find/simpleFindWidget.js';
import { KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED } from './webview.js';
let WebviewFindWidget = class WebviewFindWidget extends SimpleFindWidget {
    async _getResultCount(dataChanged) {
        return undefined;
    }
    constructor(_delegate, contextViewService, contextKeyService, hoverService, keybindingService) {
        super({
            showCommonFindToggles: false,
            checkImeCompletionState: _delegate.checkImeCompletionState,
            enableSash: true,
        }, contextViewService, contextKeyService, hoverService, keybindingService);
        this._delegate = _delegate;
        this._findWidgetFocused =
            KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED.bindTo(contextKeyService);
        this._register(_delegate.hasFindResult((hasResult) => {
            this.updateButtons(hasResult);
            this.focusFindBox();
        }));
        this._register(_delegate.onDidStopFind(() => {
            this.updateButtons(false);
        }));
    }
    find(previous) {
        const val = this.inputValue;
        if (val) {
            this._delegate.find(val, previous);
        }
    }
    hide(animated = true) {
        super.hide(animated);
        this._delegate.stopFind(true);
        this._delegate.focus();
    }
    _onInputChanged() {
        const val = this.inputValue;
        if (val) {
            this._delegate.updateFind(val);
        }
        else {
            this._delegate.stopFind(false);
        }
        return false;
    }
    _onFocusTrackerFocus() {
        this._findWidgetFocused.set(true);
    }
    _onFocusTrackerBlur() {
        this._findWidgetFocused.reset();
    }
    _onFindInputFocusTrackerFocus() { }
    _onFindInputFocusTrackerBlur() { }
    findFirst() { }
};
WebviewFindWidget = __decorate([
    __param(1, IContextViewService),
    __param(2, IContextKeyService),
    __param(3, IHoverService),
    __param(4, IKeybindingService)
], WebviewFindWidget);
export { WebviewFindWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0ZpbmRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2Jyb3dzZXIvd2Vidmlld0ZpbmRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsOENBQThDLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFZdEUsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxnQkFBZ0I7SUFDNUMsS0FBSyxDQUFDLGVBQWUsQ0FDOUIsV0FBcUI7UUFFckIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUlELFlBQ2tCLFNBQThCLEVBQzFCLGtCQUF1QyxFQUN4QyxpQkFBcUMsRUFDMUMsWUFBMkIsRUFDdEIsaUJBQXFDO1FBRXpELEtBQUssQ0FDSjtZQUNDLHFCQUFxQixFQUFFLEtBQUs7WUFDNUIsdUJBQXVCLEVBQUUsU0FBUyxDQUFDLHVCQUF1QjtZQUMxRCxVQUFVLEVBQUUsSUFBSTtTQUNoQixFQUNELGtCQUFrQixFQUNsQixpQkFBaUIsRUFDakIsWUFBWSxFQUNaLGlCQUFpQixDQUNqQixDQUFBO1FBaEJnQixjQUFTLEdBQVQsU0FBUyxDQUFxQjtRQWlCL0MsSUFBSSxDQUFDLGtCQUFrQjtZQUN0Qiw4Q0FBOEMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUV6RSxJQUFJLENBQUMsU0FBUyxDQUNiLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUNyQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzdCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNwQixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixTQUFTLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRTtZQUM1QixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFCLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU0sSUFBSSxDQUFDLFFBQWlCO1FBQzVCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDM0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNuQyxDQUFDO0lBQ0YsQ0FBQztJQUVlLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSTtRQUNuQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVTLGVBQWU7UUFDeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUMzQixJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0IsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRVMsb0JBQW9CO1FBQzdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVTLG1CQUFtQjtRQUM1QixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUVTLDZCQUE2QixLQUFJLENBQUM7SUFFbEMsNEJBQTRCLEtBQUksQ0FBQztJQUUzQyxTQUFTLEtBQUksQ0FBQztDQUNkLENBQUE7QUFoRlksaUJBQWlCO0lBVzNCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsa0JBQWtCLENBQUE7R0FkUixpQkFBaUIsQ0FnRjdCIn0=