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
import { ButtonBar } from '../../../base/browser/ui/button/button.js';
import { createInstantHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { ActionRunner, SubmenuAction, } from '../../../base/common/actions.js';
import { Codicon } from '../../../base/common/codicons.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { localize } from '../../../nls.js';
import { getActionBarActions } from './menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction } from '../common/actions.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IContextMenuService } from '../../contextview/browser/contextView.js';
import { IHoverService } from '../../hover/browser/hover.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
let WorkbenchButtonBar = class WorkbenchButtonBar extends ButtonBar {
    constructor(container, _options, _contextMenuService, _keybindingService, telemetryService, _hoverService) {
        super(container);
        this._options = _options;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._store = new DisposableStore();
        this._updateStore = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._actionRunner = this._store.add(new ActionRunner());
        if (_options?.telemetrySource) {
            this._actionRunner.onDidRun((e) => {
                telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: _options.telemetrySource });
            }, undefined, this._store);
        }
    }
    dispose() {
        this._onDidChange.dispose();
        this._updateStore.dispose();
        this._store.dispose();
        super.dispose();
    }
    update(actions, secondary) {
        const conifgProvider = this._options?.buttonConfigProvider ?? (() => ({ showLabel: true }));
        this._updateStore.clear();
        this.clear();
        // Support instamt hover between buttons
        const hoverDelegate = this._updateStore.add(createInstantHoverDelegate());
        for (let i = 0; i < actions.length; i++) {
            const secondary = i > 0;
            const actionOrSubmenu = actions[i];
            let action;
            let btn;
            if (actionOrSubmenu instanceof SubmenuAction && actionOrSubmenu.actions.length > 0) {
                const [first, ...rest] = actionOrSubmenu.actions;
                action = first;
                btn = this.addButtonWithDropdown({
                    secondary: conifgProvider(action, i)?.isSecondary ?? secondary,
                    actionRunner: this._actionRunner,
                    actions: rest,
                    contextMenuProvider: this._contextMenuService,
                    ariaLabel: action.label,
                    supportIcons: true,
                });
            }
            else {
                action = actionOrSubmenu;
                btn = this.addButton({
                    secondary: conifgProvider(action, i)?.isSecondary ?? secondary,
                    ariaLabel: action.label,
                    supportIcons: true,
                });
            }
            btn.enabled = action.enabled;
            btn.checked = action.checked ?? false;
            btn.element.classList.add('default-colors');
            const showLabel = conifgProvider(action, i)?.showLabel ?? true;
            if (showLabel) {
                btn.label = action.label;
            }
            else {
                btn.element.classList.add('monaco-text-button');
            }
            if (conifgProvider(action, i)?.showIcon) {
                if (action instanceof MenuItemAction && ThemeIcon.isThemeIcon(action.item.icon)) {
                    if (!showLabel) {
                        btn.icon = action.item.icon;
                    }
                    else {
                        // this is REALLY hacky but combining a codicon and normal text is ugly because
                        // the former define a font which doesn't work for text
                        btn.label = `$(${action.item.icon.id}) ${action.label}`;
                    }
                }
                else if (action.class) {
                    btn.element.classList.add(...action.class.split(' '));
                }
            }
            const kb = this._keybindingService.lookupKeybinding(action.id);
            let tooltip;
            if (kb) {
                tooltip = localize('labelWithKeybinding', '{0} ({1})', action.tooltip || action.label, kb.getLabel());
            }
            else {
                tooltip = action.tooltip || action.label;
            }
            this._updateStore.add(this._hoverService.setupManagedHover(hoverDelegate, btn.element, tooltip));
            this._updateStore.add(btn.onDidClick(async () => {
                this._actionRunner.run(action);
            }));
        }
        if (secondary.length > 0) {
            const btn = this.addButton({
                secondary: true,
                ariaLabel: localize('moreActions', 'More Actions'),
            });
            btn.icon = Codicon.dropDownButton;
            btn.element.classList.add('default-colors', 'monaco-text-button');
            btn.enabled = true;
            this._updateStore.add(this._hoverService.setupManagedHover(hoverDelegate, btn.element, localize('moreActions', 'More Actions')));
            this._updateStore.add(btn.onDidClick(async () => {
                this._contextMenuService.showContextMenu({
                    getAnchor: () => btn.element,
                    getActions: () => secondary,
                    actionRunner: this._actionRunner,
                    onHide: () => btn.element.setAttribute('aria-expanded', 'false'),
                });
                btn.element.setAttribute('aria-expanded', 'true');
            }));
        }
        this._onDidChange.fire(this);
    }
};
WorkbenchButtonBar = __decorate([
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, ITelemetryService),
    __param(5, IHoverService)
], WorkbenchButtonBar);
export { WorkbenchButtonBar };
let MenuWorkbenchButtonBar = class MenuWorkbenchButtonBar extends WorkbenchButtonBar {
    constructor(container, menuId, options, menuService, contextKeyService, contextMenuService, keybindingService, telemetryService, hoverService) {
        super(container, options, contextMenuService, keybindingService, telemetryService, hoverService);
        const menu = menuService.createMenu(menuId, contextKeyService);
        this._store.add(menu);
        const update = () => {
            this.clear();
            const actions = getActionBarActions(menu.getActions(options?.menuOptions), options?.toolbarOptions?.primaryGroup);
            super.update(actions.primary, actions.secondary);
        };
        this._store.add(menu.onDidChange(update));
        update();
    }
    dispose() {
        super.dispose();
    }
    update(_actions) {
        throw new Error('Use Menu or WorkbenchButtonBar');
    }
};
MenuWorkbenchButtonBar = __decorate([
    __param(3, IMenuService),
    __param(4, IContextKeyService),
    __param(5, IContextMenuService),
    __param(6, IKeybindingService),
    __param(7, ITelemetryService),
    __param(8, IHoverService)
], MenuWorkbenchButtonBar);
export { MenuWorkbenchButtonBar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnV0dG9uYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9ucy9icm93c2VyL2J1dHRvbmJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFXLE1BQU0sMkNBQTJDLENBQUE7QUFDOUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbkcsT0FBTyxFQUNOLFlBQVksRUFHWixhQUFhLEdBR2IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWxFLE9BQU8sRUFBVSxZQUFZLEVBQUUsY0FBYyxFQUFzQixNQUFNLHNCQUFzQixDQUFBO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQWtCaEUsSUFBTSxrQkFBa0IsR0FBeEIs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