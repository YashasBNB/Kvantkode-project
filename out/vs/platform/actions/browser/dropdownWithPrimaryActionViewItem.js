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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd25XaXRoUHJpbWFyeUFjdGlvblZpZXdJdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9ucy9icm93c2VyL2Ryb3Bkb3duV2l0aFByaW1hcnlBY3Rpb25WaWV3SXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlFLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUt4RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFXNUUsSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FBa0MsU0FBUSxrQkFBa0I7SUFNeEUsSUFBSSw2QkFBNkI7UUFDaEMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFBO0lBQzVDLENBQUM7SUFFRCxZQUNDLGFBQTZCLEVBQzdCLGNBQXVCLEVBQ3ZCLG1CQUF1QyxFQUN2QyxT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