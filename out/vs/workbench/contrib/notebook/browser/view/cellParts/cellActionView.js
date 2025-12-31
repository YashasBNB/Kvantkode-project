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
import * as DOM from '../../../../../../base/browser/dom.js';
import * as types from '../../../../../../base/common/types.js';
import { EventType as TouchEventType } from '../../../../../../base/browser/touch.js';
import { getDefaultHoverDelegate } from '../../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { MenuEntryActionViewItem, SubmenuEntryActionViewItem, } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuItemAction, } from '../../../../../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
export class CodiconActionViewItem extends MenuEntryActionViewItem {
    updateLabel() {
        if (this.options.label && this.label) {
            DOM.reset(this.label, ...renderLabelWithIcons(this._commandAction.label ?? ''));
        }
    }
}
export class ActionViewWithLabel extends MenuEntryActionViewItem {
    render(container) {
        super.render(container);
        container.classList.add('notebook-action-view-item');
        this._actionLabel = document.createElement('a');
        container.appendChild(this._actionLabel);
        this.updateLabel();
    }
    updateLabel() {
        if (this._actionLabel) {
            this._actionLabel.classList.add('notebook-label');
            this._actionLabel.innerText = this._action.label;
        }
    }
}
let UnifiedSubmenuActionView = class UnifiedSubmenuActionView extends SubmenuEntryActionViewItem {
    constructor(action, options, _renderLabel, subActionProvider, subActionViewItemProvider, _keybindingService, _contextMenuService, _themeService, _hoverService) {
        super(action, { ...options, hoverDelegate: options?.hoverDelegate ?? getDefaultHoverDelegate('element') }, _keybindingService, _contextMenuService, _themeService);
        this._renderLabel = _renderLabel;
        this.subActionProvider = subActionProvider;
        this.subActionViewItemProvider = subActionViewItemProvider;
        this._hoverService = _hoverService;
    }
    render(container) {
        super.render(container);
        container.classList.add('notebook-action-view-item');
        container.classList.add('notebook-action-view-item-unified');
        this._actionLabel = document.createElement('a');
        container.appendChild(this._actionLabel);
        this._hover = this._register(this._hoverService.setupManagedHover(this.options.hoverDelegate ?? getDefaultHoverDelegate('element'), this._actionLabel, ''));
        this.updateLabel();
        for (const event of [DOM.EventType.CLICK, DOM.EventType.MOUSE_DOWN, TouchEventType.Tap]) {
            this._register(DOM.addDisposableListener(container, event, (e) => this.onClick(e, true)));
        }
    }
    onClick(event, preserveFocus = false) {
        DOM.EventHelper.stop(event, true);
        const context = types.isUndefinedOrNull(this._context)
            ? this.options?.useEventAsContext
                ? event
                : { preserveFocus }
            : this._context;
        this.actionRunner.run(this._primaryAction ?? this._action, context);
    }
    updateLabel() {
        const actions = this.subActionProvider.getActions();
        if (this._actionLabel) {
            const primaryAction = actions[0];
            this._primaryAction = primaryAction;
            if (primaryAction && primaryAction instanceof MenuItemAction) {
                const element = this.element;
                if (element && primaryAction.item.icon && ThemeIcon.isThemeIcon(primaryAction.item.icon)) {
                    const iconClasses = ThemeIcon.asClassNameArray(primaryAction.item.icon);
                    // remove all classes started with 'codicon-'
                    element.classList.forEach((cl) => {
                        if (cl.startsWith('codicon-')) {
                            element.classList.remove(cl);
                        }
                    });
                    element.classList.add(...iconClasses);
                }
                if (this._renderLabel) {
                    this._actionLabel.classList.add('notebook-label');
                    this._actionLabel.innerText = this._action.label;
                    this._hover?.update(primaryAction.tooltip.length ? primaryAction.tooltip : primaryAction.label);
                }
            }
            else {
                if (this._renderLabel) {
                    this._actionLabel.classList.add('notebook-label');
                    this._actionLabel.innerText = this._action.label;
                    this._hover?.update(this._action.tooltip.length ? this._action.tooltip : this._action.label);
                }
            }
        }
    }
};
UnifiedSubmenuActionView = __decorate([
    __param(5, IKeybindingService),
    __param(6, IContextMenuService),
    __param(7, IThemeService),
    __param(8, IHoverService)
], UnifiedSubmenuActionView);
export { UnifiedSubmenuActionView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEFjdGlvblZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxBY3Rpb25WaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUE7QUFDNUQsT0FBTyxLQUFLLEtBQUssTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsU0FBUyxJQUFJLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR3JGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN0RSxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLDBCQUEwQixHQUMxQixNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFFdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWpGLE1BQU0sT0FBTyxxQkFBc0IsU0FBUSx1QkFBdUI7SUFDOUMsV0FBVztRQUM3QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN0QyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsdUJBQXVCO0lBR3RELE1BQU0sQ0FBQyxTQUFzQjtRQUNyQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZCLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQy9DLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0lBRWtCLFdBQVc7UUFDN0IsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDakQsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUNNLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsMEJBQTBCO0lBS3ZFLFlBQ0MsTUFBeUIsRUFDekIsT0FBb0QsRUFDbkMsWUFBcUIsRUFDN0IsaUJBQWtDLEVBQ2xDLHlCQUE4RCxFQUNuRCxrQkFBc0MsRUFDckMsbUJBQXdDLEVBQzlDLGFBQTRCLEVBQ1gsYUFBNEI7UUFFNUQsS0FBSyxDQUNKLE1BQU0sRUFDTixFQUFFLEdBQUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsYUFBYSxJQUFJLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQzNGLGtCQUFrQixFQUNsQixtQkFBbUIsRUFDbkIsYUFBYSxDQUNiLENBQUE7UUFkZ0IsaUJBQVksR0FBWixZQUFZLENBQVM7UUFDN0Isc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFpQjtRQUNsQyw4QkFBeUIsR0FBekIseUJBQXlCLENBQXFDO1FBSXZDLGtCQUFhLEdBQWIsYUFBYSxDQUFlO0lBUzdELENBQUM7SUFFUSxNQUFNLENBQUMsU0FBc0I7UUFDckMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN2QixTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBQ3BELFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUE7UUFDNUQsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQy9DLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRXhDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDM0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksdUJBQXVCLENBQUMsU0FBUyxDQUFDLEVBQ2hFLElBQUksQ0FBQyxZQUFZLEVBQ2pCLEVBQUUsQ0FDRixDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFFbEIsS0FBSyxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pGLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRixDQUFDO0lBQ0YsQ0FBQztJQUVRLE9BQU8sQ0FBQyxLQUFvQixFQUFFLGFBQWEsR0FBRyxLQUFLO1FBQzNELEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqQyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNyRCxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxpQkFBaUI7Z0JBQ2hDLENBQUMsQ0FBQyxLQUFLO2dCQUNQLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRTtZQUNwQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQTtRQUNoQixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVrQixXQUFXO1FBQzdCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNuRCxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN2QixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUE7WUFFbkMsSUFBSSxhQUFhLElBQUksYUFBYSxZQUFZLGNBQWMsRUFBRSxDQUFDO2dCQUM5RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO2dCQUU1QixJQUFJLE9BQU8sSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDMUYsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ3ZFLDZDQUE2QztvQkFDN0MsT0FBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTt3QkFDaEMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7NEJBQy9CLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO3dCQUM3QixDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUFBO29CQUNGLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUE7Z0JBQ3RDLENBQUM7Z0JBRUQsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO29CQUNqRCxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQTtvQkFDaEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQ2xCLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUMxRSxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO29CQUNqRCxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQTtvQkFDaEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUN2RSxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBL0ZZLHdCQUF3QjtJQVdsQyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGFBQWEsQ0FBQTtHQWRILHdCQUF3QixDQStGcEMifQ==