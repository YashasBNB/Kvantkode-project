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
import * as DOM from '../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { BaseActionViewItem, } from '../../../base/browser/ui/actionbar/actionViewItems.js';
import { DropdownMenuActionViewItem } from '../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { MenuEntryActionViewItem } from './menuEntryActionViewItem.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { INotificationService } from '../../notification/common/notification.js';
import { IThemeService } from '../../theme/common/themeService.js';
import { IContextMenuService } from '../../contextview/browser/contextView.js';
import { IAccessibilityService } from '../../accessibility/common/accessibility.js';
let DropdownWithPrimaryActionViewItem = class DropdownWithPrimaryActionViewItem extends BaseActionViewItem {
    get onDidChangeDropdownVisibility() {
        return this._dropdown.onDidChangeVisibility;
    }
    constructor(primaryAction, dropdownAction, dropdownMenuActions, className, _options, _contextMenuProvider, _keybindingService, _notificationService, _contextKeyService, _themeService, _accessibilityService) {
        super(null, primaryAction, { hoverDelegate: _options?.hoverDelegate });
        this._options = _options;
        this._contextMenuProvider = _contextMenuProvider;
        this._container = null;
        this._dropdownContainer = null;
        this._primaryAction = new MenuEntryActionViewItem(primaryAction, { hoverDelegate: _options?.hoverDelegate }, _keybindingService, _notificationService, _contextKeyService, _themeService, _contextMenuProvider, _accessibilityService);
        if (_options?.actionRunner) {
            this._primaryAction.actionRunner = _options.actionRunner;
        }
        this._dropdown = new DropdownMenuActionViewItem(dropdownAction, dropdownMenuActions, this._contextMenuProvider, {
            menuAsChild: _options?.menuAsChild ?? true,
            classNames: className
                ? ['codicon', 'codicon-chevron-down', className]
                : ['codicon', 'codicon-chevron-down'],
            actionRunner: this._options?.actionRunner,
            keybindingProvider: this._options?.getKeyBinding ??
                ((action) => _keybindingService.lookupKeybinding(action.id)),
            hoverDelegate: _options?.hoverDelegate,
            skipTelemetry: _options?.skipTelemetry,
        });
    }
    set actionRunner(actionRunner) {
        super.actionRunner = actionRunner;
        this._primaryAction.actionRunner = actionRunner;
        this._dropdown.actionRunner = actionRunner;
    }
    setActionContext(newContext) {
        super.setActionContext(newContext);
        this._primaryAction.setActionContext(newContext);
        this._dropdown.setActionContext(newContext);
    }
    render(container) {
        this._container = container;
        super.render(this._container);
        this._container.classList.add('monaco-dropdown-with-primary');
        const primaryContainer = DOM.$('.action-container');
        primaryContainer.role = 'button';
        primaryContainer.ariaDisabled = String(!this.action.enabled);
        this._primaryAction.render(DOM.append(this._container, primaryContainer));
        this._dropdownContainer = DOM.$('.dropdown-action-container');
        this._dropdown.render(DOM.append(this._container, this._dropdownContainer));
        this._register(DOM.addDisposableListener(primaryContainer, DOM.EventType.KEY_DOWN, (e) => {
            if (!this.action.enabled) {
                return;
            }
            const event = new StandardKeyboardEvent(e);
            if (event.equals(17 /* KeyCode.RightArrow */)) {
                this._primaryAction.element.tabIndex = -1;
                this._dropdown.focus();
                event.stopPropagation();
            }
        }));
        this._register(DOM.addDisposableListener(this._dropdownContainer, DOM.EventType.KEY_DOWN, (e) => {
            if (!this.action.enabled) {
                return;
            }
            const event = new StandardKeyboardEvent(e);
            if (event.equals(15 /* KeyCode.LeftArrow */)) {
                this._primaryAction.element.tabIndex = 0;
                this._dropdown.setFocusable(false);
                this._primaryAction.element?.focus();
                event.stopPropagation();
            }
        }));
        this.updateEnabled();
    }
    focus(fromRight) {
        if (fromRight) {
            this._dropdown.focus();
        }
        else {
            this._primaryAction.element.tabIndex = 0;
            this._primaryAction.element.focus();
        }
    }
    blur() {
        this._primaryAction.element.tabIndex = -1;
        this._dropdown.blur();
        this._container.blur();
    }
    setFocusable(focusable) {
        if (focusable) {
            this._primaryAction.element.tabIndex = 0;
        }
        else {
            this._primaryAction.element.tabIndex = -1;
            this._dropdown.setFocusable(false);
        }
    }
    updateEnabled() {
        const disabled = !this.action.enabled;
        this.element?.classList.toggle('disabled', disabled);
    }
    update(dropdownAction, dropdownMenuActions, dropdownIcon) {
        this._dropdown.dispose();
        this._dropdown = new DropdownMenuActionViewItem(dropdownAction, dropdownMenuActions, this._contextMenuProvider, {
            menuAsChild: this._options?.menuAsChild ?? true,
            classNames: ['codicon', dropdownIcon || 'codicon-chevron-down'],
            actionRunner: this._options?.actionRunner,
            hoverDelegate: this._options?.hoverDelegate,
            keybindingProvider: this._options?.getKeyBinding,
        });
        if (this._dropdownContainer) {
            this._dropdown.render(this._dropdownContainer);
        }
    }
    showDropdown() {
        this._dropdown.show();
    }
    dispose() {
        this._primaryAction.dispose();
        this._dropdown.dispose();
        super.dispose();
    }
};
DropdownWithPrimaryActionViewItem = __decorate([
    __param(5, IContextMenuService),
    __param(6, IKeybindingService),
    __param(7, INotificationService),
    __param(8, IContextKeyService),
    __param(9, IThemeService),
    __param(10, IAccessibilityService)
], DropdownWithPrimaryActionViewItem);
export { DropdownWithPrimaryActionViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd25XaXRoUHJpbWFyeUFjdGlvblZpZXdJdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25zL2Jyb3dzZXIvZHJvcGRvd25XaXRoUHJpbWFyeUFjdGlvblZpZXdJdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBS3hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXRFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQVc1RSxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFrQyxTQUFRLGtCQUFrQjtJQU14RSxJQUFJLDZCQUE2QjtRQUNoQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUE7SUFDNUMsQ0FBQztJQUVELFlBQ0MsYUFBNkIsRUFDN0IsY0FB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