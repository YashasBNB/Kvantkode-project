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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { TextOnlyMenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
let SuggestWidgetStatus = class SuggestWidgetStatus {
    constructor(container, _menuId, instantiationService, _menuService, _contextKeyService) {
        this._menuId = _menuId;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._menuDisposables = new DisposableStore();
        this.element = dom.append(container, dom.$('.suggest-status-bar'));
        const actionViewItemProvider = ((action) => {
            return action instanceof MenuItemAction
                ? instantiationService.createInstance(TextOnlyMenuEntryActionViewItem, action, {
                    useComma: true,
                })
                : undefined;
        });
        this._leftActions = new ActionBar(this.element, { actionViewItemProvider });
        this._rightActions = new ActionBar(this.element, { actionViewItemProvider });
        this._leftActions.domNode.classList.add('left');
        this._rightActions.domNode.classList.add('right');
    }
    dispose() {
        this._menuDisposables.dispose();
        this._leftActions.dispose();
        this._rightActions.dispose();
        this.element.remove();
    }
    show() {
        const menu = this._menuService.createMenu(this._menuId, this._contextKeyService);
        const renderMenu = () => {
            const left = [];
            const right = [];
            for (const [group, actions] of menu.getActions()) {
                if (group === 'left') {
                    left.push(...actions);
                }
                else {
                    right.push(...actions);
                }
            }
            this._leftActions.clear();
            this._leftActions.push(left);
            this._rightActions.clear();
            this._rightActions.push(right);
        };
        this._menuDisposables.add(menu.onDidChange(() => renderMenu()));
        this._menuDisposables.add(menu);
    }
    hide() {
        this._menuDisposables.clear();
    }
};
SuggestWidgetStatus = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMenuService),
    __param(4, IContextKeyService)
], SuggestWidgetStatus);
export { SuggestWidgetStatus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldFN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci9zdWdnZXN0V2lkZ2V0U3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUNOLFNBQVMsR0FFVCxNQUFNLG9EQUFvRCxDQUFBO0FBRTNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNqSCxPQUFPLEVBQ04sWUFBWSxFQUVaLGNBQWMsR0FDZCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTNGLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1CO0lBTy9CLFlBQ0MsU0FBc0IsRUFDTCxPQUFlLEVBQ1Qsb0JBQTJDLEVBQ3BELFlBQWtDLEVBQzVCLGtCQUE4QztRQUhqRCxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBRVYsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDcEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQVBsRCxxQkFBZ0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBU3hELElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7UUFFbEUsTUFBTSxzQkFBc0IsR0FBNEIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxF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