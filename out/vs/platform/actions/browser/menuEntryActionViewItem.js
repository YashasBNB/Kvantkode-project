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
import { asCSSUrl } from '../../../base/browser/cssValue.js';
import { $, addDisposableListener, append, EventType, ModifierKeyEmitter, prepend, } from '../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { ActionViewItem, BaseActionViewItem, SelectActionViewItem, } from '../../../base/browser/ui/actionbar/actionViewItems.js';
import { DropdownMenuActionViewItem, } from '../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { ActionRunner, Separator, SubmenuAction, } from '../../../base/common/actions.js';
import { UILabelProvider } from '../../../base/common/keybindingLabels.js';
import { combinedDisposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../base/common/lifecycle.js';
import { isLinux, isWindows, OS } from '../../../base/common/platform.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { assertType } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
import { IAccessibilityService } from '../../accessibility/common/accessibility.js';
import { isICommandActionToggleInfo } from '../../action/common/action.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../contextview/browser/contextView.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { INotificationService } from '../../notification/common/notification.js';
import { IStorageService } from '../../storage/common/storage.js';
import { defaultSelectBoxStyles } from '../../theme/browser/defaultStyles.js';
import { asCssVariable, selectBorder } from '../../theme/common/colorRegistry.js';
import { isDark } from '../../theme/common/theme.js';
import { IThemeService } from '../../theme/common/themeService.js';
import { IMenuService, MenuItemAction, SubmenuItemAction } from '../common/actions.js';
import './menuEntryActionViewItem.css';
export function getContextMenuActions(groups, primaryGroup) {
    const target = { primary: [], secondary: [] };
    getContextMenuActionsImpl(groups, target, primaryGroup);
    return target;
}
export function getFlatContextMenuActions(groups, primaryGroup) {
    const target = [];
    getContextMenuActionsImpl(groups, target, primaryGroup);
    return target;
}
function getContextMenuActionsImpl(groups, target, primaryGroup) {
    const modifierKeyEmitter = ModifierKeyEmitter.getInstance();
    const useAlternativeActions = modifierKeyEmitter.keyStatus.altKey ||
        ((isWindows || isLinux) && modifierKeyEmitter.keyStatus.shiftKey);
    fillInActions(groups, target, useAlternativeActions, primaryGroup
        ? (actionGroup) => actionGroup === primaryGroup
        : (actionGroup) => actionGroup === 'navigation');
}
export function getActionBarActions(groups, primaryGroup, shouldInlineSubmenu, useSeparatorsInPrimaryActions) {
    const target = { primary: [], secondary: [] };
    fillInActionBarActions(groups, target, primaryGroup, shouldInlineSubmenu, useSeparatorsInPrimaryActions);
    return target;
}
export function getFlatActionBarActions(groups, primaryGroup, shouldInlineSubmenu, useSeparatorsInPrimaryActions) {
    const target = [];
    fillInActionBarActions(groups, target, primaryGroup, shouldInlineSubmenu, useSeparatorsInPrimaryActions);
    return target;
}
export function fillInActionBarActions(groups, target, primaryGroup, shouldInlineSubmenu, useSeparatorsInPrimaryActions) {
    const isPrimaryAction = typeof primaryGroup === 'string'
        ? (actionGroup) => actionGroup === primaryGroup
        : primaryGroup;
    // Action bars handle alternative actions on their own so the alternative actions should be ignored
    fillInActions(groups, target, false, isPrimaryAction, shouldInlineSubmenu, useSeparatorsInPrimaryActions);
}
function fillInActions(groups, target, useAlternativeActions, isPrimaryAction = (actionGroup) => actionGroup === 'navigation', shouldInlineSubmenu = () => false, useSeparatorsInPrimaryActions = false) {
    let primaryBucket;
    let secondaryBucket;
    if (Array.isArray(target)) {
        primaryBucket = target;
        secondaryBucket = target;
    }
    else {
        primaryBucket = target.primary;
        secondaryBucket = target.secondary;
    }
    const submenuInfo = new Set();
    for (const [group, actions] of groups) {
        let target;
        if (isPrimaryAction(group)) {
            target = primaryBucket;
            if (target.length > 0 && useSeparatorsInPrimaryActions) {
                target.push(new Separator());
            }
        }
        else {
            target = secondaryBucket;
            if (target.length > 0) {
                target.push(new Separator());
            }
        }
        for (let action of actions) {
            if (useAlternativeActions) {
                action = action instanceof MenuItemAction && action.alt ? action.alt : action;
            }
            const newLen = target.push(action);
            // keep submenu info for later inlining
            if (action instanceof SubmenuAction) {
                submenuInfo.add({ group, action, index: newLen - 1 });
            }
        }
    }
    // ask the outside if submenu should be inlined or not. only ask when
    // there would be enough space
    for (const { group, action, index } of submenuInfo) {
        const target = isPrimaryAction(group) ? primaryBucket : secondaryBucket;
        // inlining submenus with length 0 or 1 is easy,
        // larger submenus need to be checked with the overall limit
        const submenuActions = action.actions;
        if (shouldInlineSubmenu(action, group, target.length)) {
            target.splice(index, 1, ...submenuActions);
        }
    }
}
let MenuEntryActionViewItem = class MenuEntryActionViewItem extends ActionViewItem {
    constructor(action, _options, _keybindingService, _notificationService, _contextKeyService, _themeService, _contextMenuService, _accessibilityService) {
        super(undefined, action, {
            icon: !!(action.class || action.item.icon),
            label: !action.class && !action.item.icon,
            draggable: _options?.draggable,
            keybinding: _options?.keybinding,
            hoverDelegate: _options?.hoverDelegate,
            keybindingNotRenderedWithLabel: _options?.keybindingNotRenderedWithLabel,
        });
        this._options = _options;
        this._keybindingService = _keybindingService;
        this._notificationService = _notificationService;
        this._contextKeyService = _contextKeyService;
        this._themeService = _themeService;
        this._contextMenuService = _contextMenuService;
        this._accessibilityService = _accessibilityService;
        this._wantsAltCommand = false;
        this._itemClassDispose = this._register(new MutableDisposable());
        this._altKey = ModifierKeyEmitter.getInstance();
    }
    get _menuItemAction() {
        return this._action;
    }
    get _commandAction() {
        return (this._wantsAltCommand && this._menuItemAction.alt) || this._menuItemAction;
    }
    async onClick(event) {
        event.preventDefault();
        event.stopPropagation();
        try {
            await this.actionRunner.run(this._commandAction, this._context);
        }
        catch (err) {
            this._notificationService.error(err);
        }
    }
    render(container) {
        super.render(container);
        container.classList.add('menu-entry');
        if (this.options.icon) {
            this._updateItemClass(this._menuItemAction.item);
        }
        if (this._menuItemAction.alt) {
            let isMouseOver = false;
            const updateAltState = () => {
                const wantsAltCommand = !!this._menuItemAction.alt?.enabled &&
                    (!this._accessibilityService.isMotionReduced() || isMouseOver) &&
                    (this._altKey.keyStatus.altKey || (this._altKey.keyStatus.shiftKey && isMouseOver));
                if (wantsAltCommand !== this._wantsAltCommand) {
                    this._wantsAltCommand = wantsAltCommand;
                    this.updateLabel();
                    this.updateTooltip();
                    this.updateClass();
                }
            };
            this._register(this._altKey.event(updateAltState));
            this._register(addDisposableListener(container, 'mouseleave', (_) => {
                isMouseOver = false;
                updateAltState();
            }));
            this._register(addDisposableListener(container, 'mouseenter', (_) => {
                isMouseOver = true;
                updateAltState();
            }));
            updateAltState();
        }
    }
    updateLabel() {
        if (this.options.label && this.label) {
            this.label.textContent = this._commandAction.label;
        }
    }
    getTooltip() {
        const keybinding = this._keybindingService.lookupKeybinding(this._commandAction.id, this._contextKeyService);
        const keybindingLabel = keybinding && keybinding.getLabel();
        const tooltip = this._commandAction.tooltip || this._commandAction.label;
        let title = keybindingLabel
            ? localize('titleAndKb', '{0} ({1})', tooltip, keybindingLabel)
            : tooltip;
        if (!this._wantsAltCommand && this._menuItemAction.alt?.enabled) {
            const altTooltip = this._menuItemAction.alt.tooltip || this._menuItemAction.alt.label;
            const altKeybinding = this._keybindingService.lookupKeybinding(this._menuItemAction.alt.id, this._contextKeyService);
            const altKeybindingLabel = altKeybinding && altKeybinding.getLabel();
            const altTitleSection = altKeybindingLabel
                ? localize('titleAndKb', '{0} ({1})', altTooltip, altKeybindingLabel)
                : altTooltip;
            title = localize('titleAndKbAndAlt', '{0}\n[{1}] {2}', title, UILabelProvider.modifierLabels[OS].altKey, altTitleSection);
        }
        return title;
    }
    updateClass() {
        if (this.options.icon) {
            if (this._commandAction !== this._menuItemAction) {
                if (this._menuItemAction.alt) {
                    this._updateItemClass(this._menuItemAction.alt.item);
                }
            }
            else {
                this._updateItemClass(this._menuItemAction.item);
            }
        }
    }
    _updateItemClass(item) {
        this._itemClassDispose.value = undefined;
        const { element, label } = this;
        if (!element || !label) {
            return;
        }
        const icon = this._commandAction.checked && isICommandActionToggleInfo(item.toggled) && item.toggled.icon
            ? item.toggled.icon
            : item.icon;
        if (!icon) {
            return;
        }
        if (ThemeIcon.isThemeIcon(icon)) {
            // theme icons
            const iconClasses = ThemeIcon.asClassNameArray(icon);
            label.classList.add(...iconClasses);
            this._itemClassDispose.value = toDisposable(() => {
                label.classList.remove(...iconClasses);
            });
        }
        else {
            // icon path/url
            label.style.backgroundImage = isDark(this._themeService.getColorTheme().type)
                ? asCSSUrl(icon.dark)
                : asCSSUrl(icon.light);
            label.classList.add('icon');
            this._itemClassDispose.value = combinedDisposable(toDisposable(() => {
                label.style.backgroundImage = '';
                label.classList.remove('icon');
            }), this._themeService.onDidColorThemeChange(() => {
                // refresh when the theme changes in case we go between dark <-> light
                this.updateClass();
            }));
        }
    }
};
MenuEntryActionViewItem = __decorate([
    __param(2, IKeybindingService),
    __param(3, INotificationService),
    __param(4, IContextKeyService),
    __param(5, IThemeService),
    __param(6, IContextMenuService),
    __param(7, IAccessibilityService)
], MenuEntryActionViewItem);
export { MenuEntryActionViewItem };
export class TextOnlyMenuEntryActionViewItem extends MenuEntryActionViewItem {
    render(container) {
        this.options.label = true;
        this.options.icon = false;
        super.render(container);
        container.classList.add('text-only');
        container.classList.toggle('use-comma', this._options?.useComma ?? false);
    }
    updateLabel() {
        const kb = this._keybindingService.lookupKeybinding(this._action.id, this._contextKeyService);
        if (!kb) {
            return super.updateLabel();
        }
        if (this.label) {
            const kb2 = TextOnlyMenuEntryActionViewItem._symbolPrintEnter(kb);
            if (this._options?.conversational) {
                this.label.textContent = localize({ key: 'content2', comment: ['A label with keybindg like "ESC to dismiss"'] }, '{1} to {0}', this._action.label, kb2);
            }
            else {
                this.label.textContent = localize({ key: 'content', comment: ['A label', 'A keybinding'] }, '{0} ({1})', this._action.label, kb2);
            }
        }
    }
    static _symbolPrintEnter(kb) {
        return kb
            .getLabel()
            ?.replace(/\benter\b/gi, '\u23CE')
            .replace(/\bEscape\b/gi, 'Esc');
    }
}
let SubmenuEntryActionViewItem = class SubmenuEntryActionViewItem extends DropdownMenuActionViewItem {
    constructor(action, options, _keybindingService, _contextMenuService, _themeService) {
        const dropdownOptions = {
            ...options,
            menuAsChild: options?.menuAsChild ?? false,
            classNames: options?.classNames ??
                (ThemeIcon.isThemeIcon(action.item.icon)
                    ? ThemeIcon.asClassName(action.item.icon)
                    : undefined),
            keybindingProvider: options?.keybindingProvider ?? ((action) => _keybindingService.lookupKeybinding(action.id)),
        };
        super(action, { getActions: () => action.actions }, _contextMenuService, dropdownOptions);
        this._keybindingService = _keybindingService;
        this._contextMenuService = _contextMenuService;
        this._themeService = _themeService;
    }
    render(container) {
        super.render(container);
        assertType(this.element);
        container.classList.add('menu-entry');
        const action = this._action;
        const { icon } = action.item;
        if (icon && !ThemeIcon.isThemeIcon(icon)) {
            this.element.classList.add('icon');
            const setBackgroundImage = () => {
                if (this.element) {
                    this.element.style.backgroundImage = isDark(this._themeService.getColorTheme().type)
                        ? asCSSUrl(icon.dark)
                        : asCSSUrl(icon.light);
                }
            };
            setBackgroundImage();
            this._register(this._themeService.onDidColorThemeChange(() => {
                // refresh when the theme changes in case we go between dark <-> light
                setBackgroundImage();
            }));
        }
    }
};
SubmenuEntryActionViewItem = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IThemeService)
], SubmenuEntryActionViewItem);
export { SubmenuEntryActionViewItem };
let DropdownWithDefaultActionViewItem = class DropdownWithDefaultActionViewItem extends BaseActionViewItem {
    get onDidChangeDropdownVisibility() {
        return this._dropdown.onDidChangeVisibility;
    }
    constructor(submenuAction, options, _keybindingService, _notificationService, _contextMenuService, _menuService, _instaService, _storageService) {
        super(null, submenuAction);
        this._keybindingService = _keybindingService;
        this._notificationService = _notificationService;
        this._contextMenuService = _contextMenuService;
        this._menuService = _menuService;
        this._instaService = _instaService;
        this._storageService = _storageService;
        this._defaultActionDisposables = this._register(new DisposableStore());
        this._container = null;
        this._options = options;
        this._storageKey = `${submenuAction.item.submenu.id}_lastActionId`;
        // determine default action
        let defaultAction;
        const defaultActionId = options?.persistLastActionId
            ? _storageService.get(this._storageKey, 1 /* StorageScope.WORKSPACE */)
            : undefined;
        if (defaultActionId) {
            defaultAction = submenuAction.actions.find((a) => defaultActionId === a.id);
        }
        if (!defaultAction) {
            defaultAction = submenuAction.actions[0];
        }
        this._defaultAction = this._defaultActionDisposables.add(this._instaService.createInstance(MenuEntryActionViewItem, defaultAction, {
            keybinding: this._getDefaultActionKeybindingLabel(defaultAction),
        }));
        const dropdownOptions = {
            keybindingProvider: (action) => this._keybindingService.lookupKeybinding(action.id),
            ...options,
            menuAsChild: options?.menuAsChild ?? true,
            classNames: options?.classNames ?? ['codicon', 'codicon-chevron-down'],
            actionRunner: options?.actionRunner ?? this._register(new ActionRunner()),
        };
        this._dropdown = this._register(new DropdownMenuActionViewItem(submenuAction, submenuAction.actions, this._contextMenuService, dropdownOptions));
        this._register(this._dropdown.actionRunner.onDidRun((e) => {
            if (e.action instanceof MenuItemAction) {
                this.update(e.action);
            }
        }));
    }
    update(lastAction) {
        if (this._options?.persistLastActionId) {
            this._storageService.store(this._storageKey, lastAction.id, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        this._defaultActionDisposables.clear();
        this._defaultAction = this._defaultActionDisposables.add(this._instaService.createInstance(MenuEntryActionViewItem, lastAction, {
            keybinding: this._getDefaultActionKeybindingLabel(lastAction),
        }));
        this._defaultAction.actionRunner = this._defaultActionDisposables.add(new (class extends ActionRunner {
            async runAction(action, context) {
                await action.run(undefined);
            }
        })());
        if (this._container) {
            this._defaultAction.render(prepend(this._container, $('.action-container')));
        }
    }
    _getDefaultActionKeybindingLabel(defaultAction) {
        let defaultActionKeybinding;
        if (this._options?.renderKeybindingWithDefaultActionLabel) {
            const kb = this._keybindingService.lookupKeybinding(defaultAction.id);
            if (kb) {
                defaultActionKeybinding = `(${kb.getLabel()})`;
            }
        }
        return defaultActionKeybinding;
    }
    setActionContext(newContext) {
        super.setActionContext(newContext);
        this._defaultAction.setActionContext(newContext);
        this._dropdown.setActionContext(newContext);
    }
    render(container) {
        this._container = container;
        super.render(this._container);
        this._container.classList.add('monaco-dropdown-with-default');
        const primaryContainer = $('.action-container');
        this._defaultAction.render(append(this._container, primaryContainer));
        this._register(addDisposableListener(primaryContainer, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(17 /* KeyCode.RightArrow */)) {
                this._defaultAction.element.tabIndex = -1;
                this._dropdown.focus();
                event.stopPropagation();
            }
        }));
        const dropdownContainer = $('.dropdown-action-container');
        this._dropdown.render(append(this._container, dropdownContainer));
        this._register(addDisposableListener(dropdownContainer, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(15 /* KeyCode.LeftArrow */)) {
                this._defaultAction.element.tabIndex = 0;
                this._dropdown.setFocusable(false);
                this._defaultAction.element?.focus();
                event.stopPropagation();
            }
        }));
    }
    focus(fromRight) {
        if (fromRight) {
            this._dropdown.focus();
        }
        else {
            this._defaultAction.element.tabIndex = 0;
            this._defaultAction.element.focus();
        }
    }
    blur() {
        this._defaultAction.element.tabIndex = -1;
        this._dropdown.blur();
        this._container.blur();
    }
    setFocusable(focusable) {
        if (focusable) {
            this._defaultAction.element.tabIndex = 0;
        }
        else {
            this._defaultAction.element.tabIndex = -1;
            this._dropdown.setFocusable(false);
        }
    }
};
DropdownWithDefaultActionViewItem = __decorate([
    __param(2, IKeybindingService),
    __param(3, INotificationService),
    __param(4, IContextMenuService),
    __param(5, IMenuService),
    __param(6, IInstantiationService),
    __param(7, IStorageService)
], DropdownWithDefaultActionViewItem);
export { DropdownWithDefaultActionViewItem };
let SubmenuEntrySelectActionViewItem = class SubmenuEntrySelectActionViewItem extends SelectActionViewItem {
    constructor(action, contextViewService) {
        super(null, action, action.actions.map((a) => ({
            text: a.id === Separator.ID
                ? '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'
                : a.label,
            isDisabled: !a.enabled,
        })), 0, contextViewService, defaultSelectBoxStyles, { ariaLabel: action.tooltip, optionsAsChildren: true });
        this.select(Math.max(0, action.actions.findIndex((a) => a.checked)));
    }
    render(container) {
        super.render(container);
        container.style.borderColor = asCssVariable(selectBorder);
    }
    runAction(option, index) {
        const action = this.action.actions[index];
        if (action) {
            this.actionRunner.run(action);
        }
    }
};
SubmenuEntrySelectActionViewItem = __decorate([
    __param(1, IContextViewService)
], SubmenuEntrySelectActionViewItem);
/**
 * Creates action view items for menu actions or submenu actions.
 */
export function createActionViewItem(instaService, action, options) {
    if (action instanceof MenuItemAction) {
        return instaService.createInstance(MenuEntryActionViewItem, action, options);
    }
    else if (action instanceof SubmenuItemAction) {
        if (action.item.isSelection) {
            return instaService.createInstance(SubmenuEntrySelectActionViewItem, action);
        }
        else {
            if (action.item.rememberDefaultAction) {
                return instaService.createInstance(DropdownWithDefaultActionViewItem, action, {
                    ...options,
                    persistLastActionId: true,
                });
            }
            else {
                return instaService.createInstance(SubmenuEntryActionViewItem, action, options);
            }
        }
    }
    else {
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudUVudHJ5QWN0aW9uVmlld0l0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25zL2Jyb3dzZXIvbWVudUVudHJ5QWN0aW9uVmlld0l0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFDTixDQUFDLEVBQ0QscUJBQXFCLEVBQ3JCLE1BQU0sRUFDTixTQUFTLEVBQ1Qsa0JBQWtCLEVBQ2xCLE9BQU8sR0FDUCxNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlFLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLG9CQUFvQixHQUNwQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSw2REFBNkQsQ0FBQTtBQUVwRSxPQUFPLEVBQ04sWUFBWSxFQUdaLFNBQVMsRUFDVCxhQUFhLEdBQ2IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV4QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFHMUUsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixlQUFlLEVBQ2YsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixD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