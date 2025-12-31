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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd25BY3Rpb25WaWV3SXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9kcm9wZG93bi9kcm9wZG93bkFjdGlvblZpZXdJdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLE1BQU0sRUFBMEIsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBSWxELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRTlELE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBR2xCLE1BQU0saUNBQWlDLENBQUE7QUFFeEMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUUsT0FBTyxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEVBQUUsWUFBWSxFQUF5RCxNQUFNLGVBQWUsQ0FBQTtBQW9CbkcsTUFBTSxPQUFPLDBCQUEyQixTQUFRLGtCQUFrQjtJQVdqRSxZQUNDLE1BQWUsRUFDZixxQkFBMkQsRUFDM0QsbUJBQXlDLEVBQ3pDLFVBQThDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBRWpFLEtBQUssQ0FBQyxJ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