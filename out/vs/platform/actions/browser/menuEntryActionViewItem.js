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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudUVudHJ5QWN0aW9uVmlld0l0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvYnJvd3Nlci9tZW51RW50cnlBY3Rpb25WaWV3SXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUNOLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsTUFBTSxFQUNOLFNBQVMsRUFDVCxrQkFBa0IsRUFDbEIsT0FBTyxHQUNQLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUUsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsb0JBQW9CLEdBQ3BCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUNOLDBCQUEwQixHQUUxQixNQUFNLDZEQUE2RCxDQUFBO0FBRXBFLE9BQU8sRUFDTixZQUFZLEVBR1osU0FBUyxFQUNULGFBQWEsR0FDYixNQUFNLGlDQUFpQyxDQUFBO0FBRXhDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUcxRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJB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