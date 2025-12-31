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
import { addDisposableListener, getWindow } from '../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { ToggleMenuAction, ToolBar, } from '../../../base/browser/ui/toolbar/toolbar.js';
import { Separator, toAction, } from '../../../base/common/actions.js';
import { coalesceInPlace } from '../../../base/common/arrays.js';
import { intersection } from '../../../base/common/collections.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { createActionViewItem, getActionBarActions } from './menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction, SubmenuItemAction, } from '../common/actions.js';
import { createConfigureKeybindingAction } from '../common/menuService.js';
import { ICommandService } from '../../commands/common/commands.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IContextMenuService } from '../../contextview/browser/contextView.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IActionViewItemService } from './actionViewItemService.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
export var HiddenItemStrategy;
(function (HiddenItemStrategy) {
    /** This toolbar doesn't support hiding*/
    HiddenItemStrategy[HiddenItemStrategy["NoHide"] = -1] = "NoHide";
    /** Hidden items aren't shown anywhere */
    HiddenItemStrategy[HiddenItemStrategy["Ignore"] = 0] = "Ignore";
    /** Hidden items move into the secondary group */
    HiddenItemStrategy[HiddenItemStrategy["RenderInSecondaryGroup"] = 1] = "RenderInSecondaryGroup";
})(HiddenItemStrategy || (HiddenItemStrategy = {}));
/**
 * The `WorkbenchToolBar` does
 * - support hiding of menu items
 * - lookup keybindings for each actions automatically
 * - send `workbenchActionExecuted`-events for each action
 *
 * See {@link MenuWorkbenchToolBar} for a toolbar that is backed by a menu.
 */
let WorkbenchToolBar = class WorkbenchToolBar extends ToolBar {
    constructor(container, _options, _menuService, _contextKeyService, _contextMenuService, _keybindingService, _commandService, telemetryService) {
        super(container, _contextMenuService, {
            // defaults
            getKeyBinding: (action) => _keybindingService.lookupKeybinding(action.id) ?? undefined,
            // options (override defaults)
            ..._options,
            // mandatory (overide options)
            allowContextMenu: true,
            skipTelemetry: typeof _options?.telemetrySource === 'string',
        });
        this._options = _options;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._commandService = _commandService;
        this._sessionDisposables = this._store.add(new DisposableStore());
        // telemetry logic
        const telemetrySource = _options?.telemetrySource;
        if (telemetrySource) {
            this._store.add(this.actionBar.onDidRun((e) => telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: telemetrySource })));
        }
    }
    setActions(_primary, _secondary = [], menuIds) {
        this._sessionDisposables.clear();
        const primary = _primary.slice(); // for hiding and overflow we set some items to undefined
        const secondary = _secondary.slice();
        const toggleActions = [];
        let toggleActionsCheckedCount = 0;
        const extraSecondary = [];
        let someAreHidden = false;
        // unless disabled, move all hidden items to secondary group or ignore them
        if (this._options?.hiddenItemStrategy !== -1 /* HiddenItemStrategy.NoHide */) {
            for (let i = 0; i < primary.length; i++) {
                const action = primary[i];
                if (!(action instanceof MenuItemAction) && !(action instanceof SubmenuItemAction)) {
                    // console.warn(`Action ${action.id}/${action.label} is not a MenuItemAction`);
                    continue;
                }
                if (!action.hideActions) {
                    continue;
                }
                // collect all toggle actions
                toggleActions.push(action.hideActions.toggle);
                if (action.hideActions.toggle.checked) {
                    toggleActionsCheckedCount++;
                }
                // hidden items move into overflow or ignore
                if (action.hideActions.isHidden) {
                    someAreHidden = true;
                    primary[i] = undefined;
                    if (this._options?.hiddenItemStrategy !== 0 /* HiddenItemStrategy.Ignore */) {
                        extraSecondary[i] = action;
                    }
                }
            }
        }
        // count for max
        if (this._options?.overflowBehavior !== undefined) {
            const exemptedIds = intersection(new Set(this._options.overflowBehavior.exempted), Iterable.map(primary, (a) => a?.id));
            const maxItems = this._options.overflowBehavior.maxItems - exemptedIds.size;
            let count = 0;
            for (let i = 0; i < primary.length; i++) {
                const action = primary[i];
                if (!action) {
                    continue;
                }
                count++;
                if (exemptedIds.has(action.id)) {
                    continue;
                }
                if (count >= maxItems) {
                    primary[i] = undefined;
                    extraSecondary[i] = action;
                }
            }
        }
        // coalesce turns Array<IAction|undefined> into IAction[]
        coalesceInPlace(primary);
        coalesceInPlace(extraSecondary);
        super.setActions(primary, Separator.join(extraSecondary, secondary));
        // add context menu for toggle and configure keybinding actions
        if (toggleActions.length > 0 || primary.length > 0) {
            this._sessionDisposables.add(addDisposableListener(this.getElement(), 'contextmenu', (e) => {
                const event = new StandardMouseEvent(getWindow(this.getElement()), e);
                const action = this.getItemAction(event.target);
                if (!action) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                const primaryActions = [];
                // -- Configure Keybinding Action --
                if (action instanceof MenuItemAction && action.menuKeybinding) {
                    primaryActions.push(action.menuKeybinding);
                }
                else if (!(action instanceof SubmenuItemAction || action instanceof ToggleMenuAction)) {
                    // only enable the configure keybinding action for actions that support keybindings
                    const supportsKeybindings = !!this._keybindingService.lookupKeybinding(action.id);
                    primaryActions.push(createConfigureKeybindingAction(this._commandService, this._keybindingService, action.id, undefined, supportsKeybindings));
                }
                // -- Hide Actions --
                if (toggleActions.length > 0) {
                    let noHide = false;
                    // last item cannot be hidden when using ignore strategy
                    if (toggleActionsCheckedCount === 1 &&
                        this._options?.hiddenItemStrategy === 0 /* HiddenItemStrategy.Ignore */) {
                        noHide = true;
                        for (let i = 0; i < toggleActions.length; i++) {
                            if (toggleActions[i].checked) {
                                toggleActions[i] = toAction({
                                    id: action.id,
                                    label: action.label,
                                    checked: true,
                                    enabled: false,
                                    run() { },
                                });
                                break; // there is only one
                            }
                        }
                    }
                    // add "hide foo" actions
                    if (!noHide &&
                        (action instanceof MenuItemAction || action instanceof SubmenuItemAction)) {
                        if (!action.hideActions) {
                            // no context menu for MenuItemAction instances that support no hiding
                            // those are fake actions and need to be cleaned up
                            return;
                        }
                        primaryActions.push(action.hideActions.hide);
                    }
                    else {
                        primaryActions.push(toAction({
                            id: 'label',
                            label: localize('hide', 'Hide'),
                            enabled: false,
                            run() { },
                        }));
                    }
                }
                const actions = Separator.join(primaryActions, toggleActions);
                // add "Reset Menu" action
                if (this._options?.resetMenu && !menuIds) {
                    menuIds = [this._options.resetMenu];
                }
                if (someAreHidden && menuIds) {
                    actions.push(new Separator());
                    actions.push(toAction({
                        id: 'resetThisMenu',
                        label: localize('resetThisMenu', 'Reset Menu'),
                        run: () => this._menuService.resetHiddenStates(menuIds),
                    }));
                }
                if (actions.length === 0) {
                    return;
                }
                this._contextMenuService.showContextMenu({
                    getAnchor: () => event,
                    getActions: () => actions,
                    // add context menu actions (iff appicable)
                    menuId: this._options?.contextMenu,
                    menuActionOptions: { renderShortTitle: true, ...this._options?.menuOptions },
                    skipTelemetry: typeof this._options?.telemetrySource === 'string',
                    contextKeyService: this._contextKeyService,
                });
            }));
        }
    }
};
WorkbenchToolBar = __decorate([
    __param(2, IMenuService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IKeybindingService),
    __param(6, ICommandService),
    __param(7, ITelemetryService)
], WorkbenchToolBar);
export { WorkbenchToolBar };
/**
 * A {@link WorkbenchToolBar workbench toolbar} that is purely driven from a {@link MenuId menu}-identifier.
 *
 * *Note* that Manual updates via `setActions` are NOT supported.
 */
let MenuWorkbenchToolBar = class MenuWorkbenchToolBar extends WorkbenchToolBar {
    constructor(container, menuId, options, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService, actionViewService, instaService) {
        super(container, {
            resetMenu: menuId,
            ...options,
            actionViewItemProvider: (action, opts) => {
                let provider = actionViewService.lookUp(menuId, action instanceof SubmenuItemAction ? action.item.submenu.id : action.id);
                if (!provider) {
                    provider = options?.actionViewItemProvider;
                }
                const viewItem = provider?.(action, opts);
                if (viewItem) {
                    return viewItem;
                }
                return createActionViewItem(instaService, action, opts);
            },
        }, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService);
        this._onDidChangeMenuItems = this._store.add(new Emitter());
        this.onDidChangeMenuItems = this._onDidChangeMenuItems.event;
        // update logic
        const menu = this._store.add(menuService.createMenu(menuId, contextKeyService, {
            emitEventsForSubmenuChanges: true,
            eventDebounceDelay: options?.eventDebounceDelay,
        }));
        const updateToolbar = () => {
            const { primary, secondary } = getActionBarActions(menu.getActions(options?.menuOptions), options?.toolbarOptions?.primaryGroup, options?.toolbarOptions?.shouldInlineSubmenu, options?.toolbarOptions?.useSeparatorsInPrimaryActions);
            container.classList.toggle('has-no-actions', primary.length === 0 && secondary.length === 0);
            super.setActions(primary, secondary);
        };
        this._store.add(menu.onDidChange(() => {
            updateToolbar();
            this._onDidChangeMenuItems.fire(this);
        }));
        this._store.add(actionViewService.onDidChange((e) => {
            if (e === menuId) {
                updateToolbar();
            }
        }));
        updateToolbar();
    }
    /**
     * @deprecated The WorkbenchToolBar does not support this method because it works with menus.
     */
    setActions() {
        throw new BugIndicatingError('This toolbar is populated from a menu.');
    }
};
MenuWorkbenchToolBar = __decorate([
    __param(3, IMenuService),
    __param(4, IContextKeyService),
    __param(5, IContextMenuService),
    __param(6, IKeybindingService),
    __param(7, ICommandService),
    __param(8, ITelemetryService),
    __param(9, IActionViewItemService),
    __param(10, IInstantiationService)
], MenuWorkbenchToolBar);
export { MenuWorkbenchToolBar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbGJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvYnJvd3Nlci90b29sYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBRU4sZ0JBQWdCLEVBQ2hCLE9BQU8sR0FDUCxNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFFTixTQUFTLEVBRVQsUUFBUSxHQUdSLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDeEYsT0FBTyxFQUVOLFlBQVksRUFFWixjQUFjLEVBQ2QsaUJBQWlCLEdBQ2pCLE1BQU0sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxN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