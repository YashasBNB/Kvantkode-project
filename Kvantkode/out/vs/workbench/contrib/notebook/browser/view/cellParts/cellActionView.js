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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEFjdGlvblZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbEFjdGlvblZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEtBQUssS0FBSyxNQUFNLHdDQUF3QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHckYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3RFLE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsMEJBQTBCLEdBQzFCLE1BQU0sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyxFQUNOLGNBQWMsR0FFZCxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFakYsTUFBTSxPQUFPLHFCQUFzQixTQUFRLHVCQUF1QjtJQUM5QyxXQUFXO1FBQzdCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssRUFB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