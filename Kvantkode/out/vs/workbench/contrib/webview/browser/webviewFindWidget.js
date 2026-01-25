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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0ZpbmRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvYnJvd3Nlci93ZWJ2aWV3RmluZFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSw4Q0FBOEMsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQVl0RSxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLGdCQUFnQjtJQUM1QyxLQUFLLENBQUMsZUFBZSxDQUM5QixXQUFxQjtRQUVyQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBSUQsWUFDa0IsU0FBOEIsRUFDMUIsa0JBQXVDLEVBQ3hDLGlCQUFxQyxFQUMxQyxZQUEyQixFQUN0QixpQkFBcUM7UUFFekQsS0FBSyxDQUNKO1lBQ0MscUJBQXFCLEVBQUUsS0FBSztZQUM1Qix1QkFBdUIsRUFBRSxTQUFTLENBQUMsdUJBQXVCO1lBQzFELFVBQVUsRUFBRSxJQUFJO1NBQ2hCLEVBQ0Qsa0JBQWtCLEVBQ2xCLGlCQUFpQixFQUNqQixZQUFZLEVBQ1osaUJBQWlCLENBQ2pCLENBQUE7UUFoQmdCLGNBQVMsR0FBVCxTQUFTLENBQXFCO1FBaUIvQyxJQUFJLENBQUMsa0JBQWtCO1lBQ3RCLDhDQUE4QyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRXpFLElBQUksQ0FBQyxTQUFTLENBQ2IsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDN0IsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLFNBQVMsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFO1lBQzVCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDMUIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTSxJQUFJLENBQUMsUUFBaUI7UUFDNUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUMzQixJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ25DLENBQUM7SUFDRixDQUFDO0lBRWUsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJO1FBQ25DLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRVMsZUFBZTtRQUN4QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBQzNCLElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQy9CLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFUyxvQkFBb0I7UUFDN0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRVMsbUJBQW1CO1FBQzVCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBRVMsNkJBQTZCLEtBQUksQ0FBQztJQUVsQyw0QkFBNEIsS0FBSSxDQUFDO0lBRTNDLFNBQVMsS0FBSSxDQUFDO0NBQ2QsQ0FBQTtBQWhGWSxpQkFBaUI7SUFXM0IsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxrQkFBa0IsQ0FBQTtHQWRSLGlCQUFpQixDQWdGN0IifQ==