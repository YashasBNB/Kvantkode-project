/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Action } from '../../../common/actions.js';
import { Codicon } from '../../../common/codicons.js';
import { Emitter } from '../../../common/event.js';
import { ThemeIcon } from '../../../common/themables.js';
import { $, addDisposableListener, append, EventType, h } from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { ActionViewItem, BaseActionViewItem, } from '../actionbar/actionViewItems.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import './dropdown.css';
import { DropdownMenu } from './dropdown.js';
export class DropdownMenuActionViewItem extends BaseActionViewItem {
    constructor(action, menuActionsOrProvider, contextMenuProvider, options = Object.create(null)) {
        super(null, action, options);
        this.actionItem = null;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this.menuActionsOrProvider = menuActionsOrProvider;
        this.contextMenuProvider = contextMenuProvider;
        this.options = options;
        if (this.options.actionRunner) {
            this.actionRunner = this.options.actionRunner;
        }
    }
    render(container) {
        this.actionItem = container;
        const labelRenderer = (el) => {
            this.element = append(el, $('a.action-label'));
            return this.renderLabel(this.element);
        };
        const isActionsArray = Array.isArray(this.menuActionsOrProvider);
        const options = {
            contextMenuProvider: this.contextMenuProvider,
            labelRenderer: labelRenderer,
            menuAsChild: this.options.menuAsChild,
            actions: isActionsArray ? this.menuActionsOrProvider : undefined,
            actionProvider: isActionsArray ? undefined : this.menuActionsOrProvider,
            skipTelemetry: this.options.skipTelemetry,
        };
        this.dropdownMenu = this._register(new DropdownMenu(container, options));
        this._register(this.dropdownMenu.onDidChangeVisibility((visible) => {
            this.element?.setAttribute('aria-expanded', `${visible}`);
            this._onDidChangeVisibility.fire(visible);
        }));
        this.dropdownMenu.menuOptions = {
            actionViewItemProvider: this.options.actionViewItemProvider,
            actionRunner: this.actionRunner,
            getKeyBinding: this.options.keybindingProvider,
            context: this._context,
        };
        if (this.options.anchorAlignmentProvider) {
            const that = this;
            this.dropdownMenu.menuOptions = {
                ...this.dropdownMenu.menuOptions,
                get anchorAlignment() {
                    return that.options.anchorAlignmentProvider();
                },
            };
        }
        this.updateTooltip();
        this.updateEnabled();
    }
    renderLabel(element) {
        let classNames = [];
        if (typeof this.options.classNames === 'string') {
            classNames = this.options.classNames.split(/\s+/g).filter((s) => !!s);
        }
        else if (this.options.classNames) {
            classNames = this.options.classNames;
        }
        // todo@aeschli: remove codicon, should come through `this.options.classNames`
        if (!classNames.find((c) => c === 'icon')) {
            classNames.push('codicon');
        }
        element.classList.add(...classNames);
        if (this._action.label) {
            this._register(getBaseLayerHoverDelegate().setupManagedHover(this.options.hoverDelegate ?? getDefaultHoverDelegate('mouse'), element, this._action.label));
        }
        return null;
    }
    setAriaLabelAttributes(element) {
        element.setAttribute('role', 'button');
        element.setAttribute('aria-haspopup', 'true');
        element.setAttribute('aria-expanded', 'false');
        element.ariaLabel = this._action.label || '';
    }
    getTooltip() {
        let title = null;
        if (this.action.tooltip) {
            title = this.action.tooltip;
        }
        else if (this.action.label) {
            title = this.action.label;
        }
        return title ?? undefined;
    }
    setActionContext(newContext) {
        super.setActionContext(newContext);
        if (this.dropdownMenu) {
            if (this.dropdownMenu.menuOptions) {
                this.dropdownMenu.menuOptions.context = newContext;
            }
            else {
                this.dropdownMenu.menuOptions = { context: newContext };
            }
        }
    }
    show() {
        this.dropdownMenu?.show();
    }
    updateEnabled() {
        const disabled = !this.action.enabled;
        this.actionItem?.classList.toggle('disabled', disabled);
        this.element?.classList.toggle('disabled', disabled);
    }
}
export class ActionWithDropdownActionViewItem extends ActionViewItem {
    constructor(context, action, options, contextMenuProvider) {
        super(context, action, options);
        this.contextMenuProvider = contextMenuProvider;
    }
    render(container) {
        super.render(container);
        if (this.element) {
            this.element.classList.add('action-dropdown-item');
            const menuActionsProvider = {
                getActions: () => {
                    const actionsProvider = this.options
                        .menuActionsOrProvider;
                    return Array.isArray(actionsProvider)
                        ? actionsProvider
                        : actionsProvider.getActions(); // TODO: microsoft/TypeScript#42768
                },
            };
            const menuActionClassNames = this.options.menuActionClassNames || [];
            const separator = h('div.action-dropdown-item-separator', [h('div', {})]).root;
            separator.classList.toggle('prominent', menuActionClassNames.includes('prominent'));
            append(this.element, separator);
            this.dropdownMenuActionViewItem = this._register(new DropdownMenuActionViewItem(this._register(new Action('dropdownAction', nls.localize('moreActions', 'More Actions...'))), menuActionsProvider, this.contextMenuProvider, {
                classNames: [
                    'dropdown',
                    ...ThemeIcon.asClassNameArray(Codicon.dropDownButton),
                    ...menuActionClassNames,
                ],
                hoverDelegate: this.options.hoverDelegate,
            }));
            this.dropdownMenuActionViewItem.render(this.element);
            this._register(addDisposableListener(this.element, EventType.KEY_DOWN, (e) => {
                // If we don't have any actions then the dropdown is hidden so don't try to focus it #164050
                if (menuActionsProvider.getActions().length === 0) {
                    return;
                }
                const event = new StandardKeyboardEvent(e);
                let handled = false;
                if (this.dropdownMenuActionViewItem?.isFocused() && event.equals(15 /* KeyCode.LeftArrow */)) {
                    handled = true;
                    this.dropdownMenuActionViewItem?.blur();
                    this.focus();
                }
                else if (this.isFocused() && event.equals(17 /* KeyCode.RightArrow */)) {
                    handled = true;
                    this.blur();
                    this.dropdownMenuActionViewItem?.focus();
                }
                if (handled) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }));
        }
    }
    blur() {
        super.blur();
        this.dropdownMenuActionViewItem?.blur();
    }
    setFocusable(focusable) {
        super.setFocusable(focusable);
        this.dropdownMenuActionViewItem?.setFocusable(focusable);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd25BY3Rpb25WaWV3SXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2Ryb3Bkb3duL2Ryb3Bkb3duQWN0aW9uVmlld0l0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUEwQixNQUFNLDRCQUE0QixDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFJbEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXhELE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFOUQsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsR0FHbEIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV4QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRSxPQUFPLGdCQUFnQixDQUFBO0FBQ3ZCLE9BQU8sRUFBRSxZQUFZLEVBQXlELE1BQU0sZUFBZSxDQUFBO0FBb0JuRyxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsa0JBQWtCO0lBV2pFLFlBQ0MsTUFBZSxFQUNmLHFCQUEyRCxFQUMzRCxtQkFBeUMsRUFDekMsVUFBOEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFFakUsS0FBSyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFickIsZUFBVSxHQUF1QixJQUFJLENBQUE7UUFFckMsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDOUQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQTtRQVlqRSxJQUFJLENBQUMscUJBQXFCLEdBQUcscUJBQXFCLENBQUE7UUFDbEQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLG1CQUFtQixDQUFBO1FBQzlDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBRXRCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFBO1FBQzlDLENBQUM7SUFDRixDQUFDO0lBRVEsTUFBTSxDQUFDLFNBQXNCO1FBQ3JDLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBRTNCLE1BQU0sYUFBYSxHQUFtQixDQUFDLEVBQWUsRUFBc0IsRUFBRTtZQUM3RSxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtZQUM5QyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3RDLENBQUMsQ0FBQTtRQUVELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDaEUsTUFBTSxPQUFPLEdBQXlCO1lBQ3JDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxtQkFBbUI7WUFDN0MsYUFBYSxFQUFFLGFBQWE7WUFDNUIsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNyQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBRSxJQUFJLENBQUMscUJBQW1DLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDL0UsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBRSxJQUFJLENBQUMscUJBQXlDO1lBQzVGLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWE7U0FDekMsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN4RSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxlQUFlLEVBQUUsR0FBRyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQ3pELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDMUMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxHQUFHO1lBQy9CLHNCQUFzQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCO1lBQzNELFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0I7WUFDOUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRO1NBQ3RCLENBQUE7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUMxQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUE7WUFFakIsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEdBQUc7Z0JBQy9CLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXO2dCQUNoQyxJQUFJLGVBQWU7b0JBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBd0IsRUFBRSxDQUFBO2dCQUMvQyxDQUFDO2FBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO0lBQ3JCLENBQUM7SUFFUyxXQUFXLENBQUMsT0FBb0I7UUFDekMsSUFBSSxVQUFVLEdBQWEsRUFBRSxDQUFBO1FBRTdCLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqRCxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDcEMsVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFBO1FBQ3JDLENBQUM7UUFFRCw4RUFBOEU7UUFDOUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzNDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUVELE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUE7UUFFcEMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxTQUFTLENBQ2IseUJBQXlCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQzlELE9BQU8sRUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FDbEIsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVTLHNCQUFzQixDQUFDLE9BQW9CO1FBQ3BELE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3RDLE9BQU8sQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdDLE9BQU8sQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzlDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFBO0lBQzdDLENBQUM7SUFFa0IsVUFBVTtRQUM1QixJQUFJLEtBQUssR0FBa0IsSUFBSSxDQUFBO1FBRS9CLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN6QixLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUE7UUFDNUIsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM5QixLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUE7UUFDMUIsQ0FBQztRQUVELE9BQU8sS0FBSyxJQUFJLFNBQVMsQ0FBQTtJQUMxQixDQUFDO0lBRVEsZ0JBQWdCLENBQUMsVUFBbUI7UUFDNUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRWxDLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQTtZQUNuRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEdBQUcsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUE7WUFDeEQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVrQixhQUFhO1FBQy9CLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUE7UUFDckMsSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JELENBQUM7Q0FDRDtBQU9ELE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxjQUFjO0lBR25FLFlBQ0MsT0FBZ0IsRUFDaEIsTUFBZSxFQUNmLE9BQWlELEVBQ2hDLG1CQUF5QztRQUUxRCxLQUFLLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUZkLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7SUFHM0QsQ0FBQztJQUVRLE1BQU0sQ0FBQyxTQUFzQjtRQUNyQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1lBQ2xELE1BQU0sbUJBQW1CLEdBQUc7Z0JBQzNCLFVBQVUsRUFBRSxHQUFHLEVBQUU7b0JBQ2hCLE1BQU0sZUFBZSxHQUE4QyxJQUFJLENBQUMsT0FBUTt5QkFDOUUscUJBQXFCLENBQUE7b0JBQ3ZCLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7d0JBQ3BDLENBQUMsQ0FBQyxlQUFlO3dCQUNqQixDQUFDLENBQUUsZUFBbUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQSxDQUFDLG1DQUFtQztnQkFDekYsQ0FBQzthQUNELENBQUE7WUFFRCxNQUFNLG9CQUFvQixHQUNrQixJQUFJLENBQUMsT0FBUSxDQUFDLG9CQUFvQixJQUFJLEVBQUUsQ0FBQTtZQUNwRixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsb0NBQW9DLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7WUFDOUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1lBQ25GLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBRS9CLElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQyxJQUFJLDBCQUEwQixDQUM3QixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksTUFBTSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FDNUUsRUFDRCxtQkFBbUIsRUFDbkIsSUFBSSxDQUFDLG1CQUFtQixFQUN4QjtnQkFDQyxVQUFVLEVBQUU7b0JBQ1gsVUFBVTtvQkFDVixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO29CQUNyRCxHQUFHLG9CQUFvQjtpQkFDdkI7Z0JBQ0QsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYTthQUN6QyxDQUNELENBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBRXBELElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzdELDRGQUE0RjtnQkFDNUYsSUFBSSxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25ELE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxJQUFJLE9BQU8sR0FBWSxLQUFLLENBQUE7Z0JBQzVCLElBQUksSUFBSSxDQUFDLDBCQUEwQixFQUFFLFNBQVMsRUFBRSxJQUFJLEtBQUssQ0FBQyxNQUFNLDRCQUFtQixFQUFFLENBQUM7b0JBQ3JGLE9BQU8sR0FBRyxJQUFJLENBQUE7b0JBQ2QsSUFBSSxDQUFDLDBCQUEwQixFQUFFLElBQUksRUFBRSxDQUFBO29CQUN2QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ2IsQ0FBQztxQkFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxLQUFLLENBQUMsTUFBTSw2QkFBb0IsRUFBRSxDQUFDO29CQUNqRSxPQUFPLEdBQUcsSUFBSSxDQUFBO29CQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtvQkFDWCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxFQUFFLENBQUE7Z0JBQ3pDLENBQUM7Z0JBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDYixLQUFLLENBQUMsY0FBYyxFQUFFLENBQUE7b0JBQ3RCLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQTtnQkFDeEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVRLElBQUk7UUFDWixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDWixJQUFJLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxFQUFFLENBQUE7SUFDeEMsQ0FBQztJQUVRLFlBQVksQ0FBQyxTQUFrQjtRQUN2QyxLQUFLLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzdCLElBQUksQ0FBQywwQkFBMEIsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDekQsQ0FBQztDQUNEIn0=