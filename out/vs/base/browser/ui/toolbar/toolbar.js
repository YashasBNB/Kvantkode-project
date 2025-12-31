/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ActionBar } from '../actionbar/actionbar.js';
import { DropdownMenuActionViewItem } from '../dropdown/dropdownActionViewItem.js';
import { Action, SubmenuAction } from '../../../common/actions.js';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import { EventMultiplexer } from '../../../common/event.js';
import { Disposable, DisposableStore } from '../../../common/lifecycle.js';
import './toolbar.css';
import * as nls from '../../../../nls.js';
import { createInstantHoverDelegate } from '../hover/hoverDelegateFactory.js';
/**
 * A widget that combines an action bar for primary actions and a dropdown for secondary actions.
 */
export class ToolBar extends Disposable {
    constructor(container, contextMenuProvider, options = { orientation: 0 /* ActionsOrientation.HORIZONTAL */ }) {
        super();
        this.submenuActionViewItems = [];
        this.hasSecondaryActions = false;
        this._onDidChangeDropdownVisibility = this._register(new EventMultiplexer());
        this.onDidChangeDropdownVisibility = this._onDidChangeDropdownVisibility.event;
        this.disposables = this._register(new DisposableStore());
        options.hoverDelegate = options.hoverDelegate ?? this._register(createInstantHoverDelegate());
        this.options = options;
        this.toggleMenuAction = this._register(new ToggleMenuAction(() => this.toggleMenuActionViewItem?.show(), options.toggleMenuTitle));
        this.element = document.createElement('div');
        this.element.className = 'monaco-toolbar';
        container.appendChild(this.element);
        this.actionBar = this._register(new ActionBar(this.element, {
            orientation: options.orientation,
            ariaLabel: options.ariaLabel,
            actionRunner: options.actionRunner,
            allowContextMenu: options.allowContextMenu,
            highlightToggledItems: options.highlightToggledItems,
            hoverDelegate: options.hoverDelegate,
            actionViewItemProvider: (action, viewItemOptions) => {
                if (action.id === ToggleMenuAction.ID) {
                    this.toggleMenuActionViewItem = new DropdownMenuActionViewItem(action, action.menuActions, contextMenuProvider, {
                        actionViewItemProvider: this.options.actionViewItemProvider,
                        actionRunner: this.actionRunner,
                        keybindingProvider: this.options.getKeyBinding,
                        classNames: ThemeIcon.asClassNameArray(options.moreIcon ?? Codicon.toolBarMore),
                        anchorAlignmentProvider: this.options.anchorAlignmentProvider,
                        menuAsChild: !!this.options.renderDropdownAsChildElement,
                        skipTelemetry: this.options.skipTelemetry,
                        isMenu: true,
                        hoverDelegate: this.options.hoverDelegate,
                    });
                    this.toggleMenuActionViewItem.setActionContext(this.actionBar.context);
                    this.disposables.add(this._onDidChangeDropdownVisibility.add(this.toggleMenuActionViewItem.onDidChangeVisibility));
                    return this.toggleMenuActionViewItem;
                }
                if (options.actionViewItemProvider) {
                    const result = options.actionViewItemProvider(action, viewItemOptions);
                    if (result) {
                        return result;
                    }
                }
                if (action instanceof SubmenuAction) {
                    const result = new DropdownMenuActionViewItem(action, action.actions, contextMenuProvider, {
                        actionViewItemProvider: this.options.actionViewItemProvider,
                        actionRunner: this.actionRunner,
                        keybindingProvider: this.options.getKeyBinding,
                        classNames: action.class,
                        anchorAlignmentProvider: this.options.anchorAlignmentProvider,
                        menuAsChild: !!this.options.renderDropdownAsChildElement,
                        skipTelemetry: this.options.skipTelemetry,
                        hoverDelegate: this.options.hoverDelegate,
                    });
                    result.setActionContext(this.actionBar.context);
                    this.submenuActionViewItems.push(result);
                    this.disposables.add(this._onDidChangeDropdownVisibility.add(result.onDidChangeVisibility));
                    return result;
                }
                return undefined;
            },
        }));
    }
    set actionRunner(actionRunner) {
        this.actionBar.actionRunner = actionRunner;
    }
    get actionRunner() {
        return this.actionBar.actionRunner;
    }
    set context(context) {
        this.actionBar.context = context;
        this.toggleMenuActionViewItem?.setActionContext(context);
        for (const actionViewItem of this.submenuActionViewItems) {
            actionViewItem.setActionContext(context);
        }
    }
    getElement() {
        return this.element;
    }
    focus() {
        this.actionBar.focus();
    }
    getItemsWidth() {
        let itemsWidth = 0;
        for (let i = 0; i < this.actionBar.length(); i++) {
            itemsWidth += this.actionBar.getWidth(i);
        }
        return itemsWidth;
    }
    getItemAction(indexOrElement) {
        return this.actionBar.getAction(indexOrElement);
    }
    getItemWidth(index) {
        return this.actionBar.getWidth(index);
    }
    getItemsLength() {
        return this.actionBar.length();
    }
    setAriaLabel(label) {
        this.actionBar.setAriaLabel(label);
    }
    setActions(primaryActions, secondaryActions) {
        this.clear();
        const primaryActionsToSet = primaryActions ? primaryActions.slice(0) : [];
        // Inject additional action to open secondary actions if present
        this.hasSecondaryActions = !!(secondaryActions && secondaryActions.length > 0);
        if (this.hasSecondaryActions && secondaryActions) {
            this.toggleMenuAction.menuActions = secondaryActions.slice(0);
            primaryActionsToSet.push(this.toggleMenuAction);
        }
        primaryActionsToSet.forEach((action) => {
            this.actionBar.push(action, {
                icon: this.options.icon ?? true,
                label: this.options.label ?? false,
                keybinding: this.getKeybindingLabel(action),
            });
        });
    }
    isEmpty() {
        return this.actionBar.isEmpty();
    }
    getKeybindingLabel(action) {
        const key = this.options.getKeyBinding?.(action);
        return key?.getLabel() ?? undefined;
    }
    clear() {
        this.submenuActionViewItems = [];
        this.disposables.clear();
        this.actionBar.clear();
    }
    dispose() {
        this.clear();
        this.disposables.dispose();
        super.dispose();
    }
}
export class ToggleMenuAction extends Action {
    static { this.ID = 'toolbar.toggle.more'; }
    constructor(toggleDropdownMenu, title) {
        title = title || nls.localize('moreActions', 'More Actions...');
        super(ToggleMenuAction.ID, title, undefined, true);
        this._menuActions = [];
        this.toggleDropdownMenu = toggleDropdownMenu;
    }
    async run() {
        this.toggleDropdownMenu();
    }
    get menuActions() {
        return this._menuActions;
    }
    set menuActions(actions) {
        this._menuActions = actions;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbGJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90b29sYmFyL3Rvb2xiYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFNBQVMsRUFBK0MsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUEwQixhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRTNELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDMUUsT0FBTyxlQUFlLENBQUE7QUFDdEIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQWdDN0U7O0dBRUc7QUFDSCxNQUFNLE9BQU8sT0FBUSxTQUFRLFVBQVU7SUFhdEMsWUFDQyxTQUFzQixFQUN0QixtQkFBeUMsRUFDekMsVUFBMkIsRUFBRSxXQUFXLHVDQUErQixFQUFFO1FBRXpFLEtBQUssRUFBRSxDQUFBO1FBYkEsMkJBQXNCLEdBQWlDLEVBQUUsQ0FBQTtRQUN6RCx3QkFBbUIsR0FBWSxLQUFLLENBQUE7UUFHcEMsbUNBQThCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdCQUFnQixFQUFXLENBQUMsQ0FBQTtRQUMvRSxrQ0FBNkIsR0FBRyxJQUFJLENBQUMsOEJBQThCLENB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