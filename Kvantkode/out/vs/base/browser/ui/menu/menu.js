/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFirefox } from '../../browser.js';
import { EventType as TouchEventType, Gesture } from '../../touch.js';
import { $, addDisposableListener, append, clearNode, Dimension, EventHelper, EventType, getActiveElement, getWindow, isAncestor, isInShadowDOM, } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { StandardMouseEvent } from '../../mouseEvent.js';
import { ActionBar } from '../actionbar/actionbar.js';
import { ActionViewItem, BaseActionViewItem, } from '../actionbar/actionViewItems.js';
import { layout } from '../contextview/contextview.js';
import { DomScrollableElement } from '../scrollbar/scrollableElement.js';
import { EmptySubmenuAction, Separator, SubmenuAction, } from '../../../common/actions.js';
import { RunOnceScheduler } from '../../../common/async.js';
import { Codicon } from '../../../common/codicons.js';
import { getCodiconFontCharacters } from '../../../common/codiconsUtil.js';
import { ThemeIcon } from '../../../common/themables.js';
import { stripIcons } from '../../../common/iconLabels.js';
import { DisposableStore } from '../../../common/lifecycle.js';
import { isLinux, isMacintosh } from '../../../common/platform.js';
import * as strings from '../../../common/strings.js';
export const MENU_MNEMONIC_REGEX = /\(&([^\s&])\)|(^|[^&])&([^\s&])/;
export const MENU_ESCAPED_MNEMONIC_REGEX = /(&amp;)?(&amp;)([^\s&])/g;
export var HorizontalDirection;
(function (HorizontalDirection) {
    HorizontalDirection[HorizontalDirection["Right"] = 0] = "Right";
    HorizontalDirection[HorizontalDirection["Left"] = 1] = "Left";
})(HorizontalDirection || (HorizontalDirection = {}));
export var VerticalDirection;
(function (VerticalDirection) {
    VerticalDirection[VerticalDirection["Above"] = 0] = "Above";
    VerticalDirection[VerticalDirection["Below"] = 1] = "Below";
})(VerticalDirection || (VerticalDirection = {}));
export const unthemedMenuStyles = {
    shadowColor: undefined,
    borderColor: undefined,
    foregroundColor: undefined,
    backgroundColor: undefined,
    selectionForegroundColor: undefined,
    selectionBackgroundColor: undefined,
    selectionBorderColor: undefined,
    separatorColor: undefined,
    scrollbarShadow: undefined,
    scrollbarSliderBackground: undefined,
    scrollbarSliderHoverBackground: undefined,
    scrollbarSliderActiveBackground: undefined,
};
export class Menu extends ActionBar {
    constructor(container, actions, options, menuStyles) {
        container.classList.add('monaco-menu-container');
        container.setAttribute('role', 'presentation');
        const menuElement = document.createElement('div');
        menuElement.classList.add('monaco-menu');
        menuElement.setAttribute('role', 'presentation');
        super(menuElement, {
            orientation: 1 /* ActionsOrientation.VERTICAL */,
            actionViewItemProvider: (action) => this.doGetActionViewItem(action, options, parentData),
            context: options.context,
            actionRunner: options.actionRunner,
            ariaLabel: options.ariaLabel,
            ariaRole: 'menu',
            focusOnlyEnabledItems: true,
            triggerKeys: {
                keys: [3 /* KeyCode.Enter */, ...(isMacintosh || isLinux ? [10 /* KeyCode.Space */] : [])],
                keyDown: true,
            },
        });
        this.menuStyles = menuStyles;
        this.menuElement = menuElement;
        this.actionsList.tabIndex = 0;
        this.initializeOrUpdateStyleSheet(container, menuStyles);
        this._register(Gesture.addTarget(menuElement));
        this._register(addDisposableListener(menuElement, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            // Stop tab navigation of menus
            if (event.equals(2 /* KeyCode.Tab */)) {
                e.preventDefault();
            }
        }));
        if (options.enableMnemonics) {
            this._register(addDisposableListener(menuElement, EventType.KEY_DOWN, (e) => {
                const key = e.key.toLocaleLowerCase();
                if (this.mnemonics.has(key)) {
                    EventHelper.stop(e, true);
                    const actions = this.mnemonics.get(key);
                    if (actions.length === 1) {
                        if (actions[0] instanceof SubmenuMenuActionViewItem && actions[0].container) {
                            this.focusItemByElement(actions[0].container);
                        }
                        actions[0].onClick(e);
                    }
                    if (actions.length > 1) {
                        const action = actions.shift();
                        if (action && action.container) {
                            this.focusItemByElement(action.container);
                            actions.push(action);
                        }
                        this.mnemonics.set(key, actions);
                    }
                }
            }));
        }
        if (isLinux) {
            this._register(addDisposableListener(menuElement, EventType.KEY_DOWN, (e) => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(14 /* KeyCode.Home */) || event.equals(11 /* KeyCode.PageUp */)) {
                    this.focusedItem = this.viewItems.length - 1;
                    this.focusNext();
                    EventHelper.stop(e, true);
                }
                else if (event.equals(13 /* KeyCode.End */) || event.equals(12 /* KeyCode.PageDown */)) {
                    this.focusedItem = 0;
                    this.focusPrevious();
                    EventHelper.stop(e, true);
                }
            }));
        }
        this._register(addDisposableListener(this.domNode, EventType.MOUSE_OUT, (e) => {
            const relatedTarget = e.relatedTarget;
            if (!isAncestor(relatedTarget, this.domNode)) {
                this.focusedItem = undefined;
                this.updateFocus();
                e.stopPropagation();
            }
        }));
        this._register(addDisposableListener(this.actionsList, EventType.MOUSE_OVER, (e) => {
            let target = e.target;
            if (!target || !isAncestor(target, this.actionsList) || target === this.actionsList) {
                return;
            }
            while (target.parentElement !== this.actionsList && target.parentElement !== null) {
                target = target.parentElement;
            }
            if (target.classList.contains('action-item')) {
                const lastFocusedItem = this.focusedItem;
                this.setFocusedItem(target);
                if (lastFocusedItem !== this.focusedItem) {
                    this.updateFocus();
                }
            }
        }));
        // Support touch on actions list to focus items (needed for submenus)
        this._register(Gesture.addTarget(this.actionsList));
        this._register(addDisposableListener(this.actionsList, TouchEventType.Tap, (e) => {
            let target = e.initialTarget;
            if (!target || !isAncestor(target, this.actionsList) || target === this.actionsList) {
                return;
            }
            while (target.parentElement !== this.actionsList && target.parentElement !== null) {
                target = target.parentElement;
            }
            if (target.classList.contains('action-item')) {
                const lastFocusedItem = this.focusedItem;
                this.setFocusedItem(target);
                if (lastFocusedItem !== this.focusedItem) {
                    this.updateFocus();
                }
            }
        }));
        const parentData = {
            parent: this,
        };
        this.mnemonics = new Map();
        // Scroll Logic
        this.scrollableElement = this._register(new DomScrollableElement(menuElement, {
            alwaysConsumeMouseWheel: true,
            horizontal: 2 /* ScrollbarVisibility.Hidden */,
            vertical: 3 /* ScrollbarVisibility.Visible */,
            verticalScrollbarSize: 7,
            handleMouseWheel: true,
            useShadows: true,
        }));
        const scrollElement = this.scrollableElement.getDomNode();
        scrollElement.style.position = '';
        this.styleScrollElement(scrollElement, menuStyles);
        // Support scroll on menu drag
        this._register(addDisposableListener(menuElement, TouchEventType.Change, (e) => {
            EventHelper.stop(e, true);
            const scrollTop = this.scrollableElement.getScrollPosition().scrollTop;
            this.scrollableElement.setScrollPosition({ scrollTop: scrollTop - e.translationY });
        }));
        this._register(addDisposableListener(scrollElement, EventType.MOUSE_UP, (e) => {
            // Absorb clicks in menu dead space https://github.com/microsoft/vscode/issues/63575
            // We do this on the scroll element so the scroll bar doesn't dismiss the menu either
            e.preventDefault();
        }));
        const window = getWindow(container);
        menuElement.style.maxHeight = `${Math.max(10, window.innerHeight - container.getBoundingClientRect().top - 35)}px`;
        actions = actions.filter((a, idx) => {
            if (options.submenuIds?.has(a.id)) {
                console.warn(`Found submenu cycle: ${a.id}`);
                return false;
            }
            // Filter out consecutive or useless separators
            if (a instanceof Separator) {
                if (idx === actions.length - 1 || idx === 0) {
                    return false;
                }
                const prevAction = actions[idx - 1];
                if (prevAction instanceof Separator) {
                    return false;
                }
            }
            return true;
        });
        this.push(actions, { icon: true, label: true, isMenu: true });
        container.appendChild(this.scrollableElement.getDomNode());
        this.scrollableElement.scanDomNode();
        this.viewItems
            .filter((item) => !(item instanceof MenuSeparatorActionViewItem))
            .forEach((item, index, array) => {
            ;
            item.updatePositionInSet(index + 1, array.length);
        });
    }
    initializeOrUpdateStyleSheet(container, style) {
        if (!this.styleSheet) {
            if (isInShadowDOM(container)) {
                this.styleSheet = createStyleSheet(container);
            }
            else {
                if (!Menu.globalStyleSheet) {
                    Menu.globalStyleSheet = createStyleSheet();
                }
                this.styleSheet = Menu.globalStyleSheet;
            }
        }
        this.styleSheet.textContent = getMenuWidgetCSS(style, isInShadowDOM(container));
    }
    styleScrollElement(scrollElement, style) {
        const fgColor = style.foregroundColor ?? '';
        const bgColor = style.backgroundColor ?? '';
        const border = style.borderColor ? `1px solid ${style.borderColor}` : '';
        const borderRadius = '5px';
        const shadow = style.shadowColor ? `0 2px 8px ${style.shadowColor}` : '';
        scrollElement.style.outline = border;
        scrollElement.style.borderRadius = borderRadius;
        scrollElement.style.color = fgColor;
        scrollElement.style.backgroundColor = bgColor;
        scrollElement.style.boxShadow = shadow;
    }
    getContainer() {
        return this.scrollableElement.getDomNode();
    }
    get onScroll() {
        return this.scrollableElement.onScroll;
    }
    get scrollOffset() {
        return this.menuElement.scrollTop;
    }
    trigger(index) {
        if (index <= this.viewItems.length && index >= 0) {
            const item = this.viewItems[index];
            if (item instanceof SubmenuMenuActionViewItem) {
                super.focus(index);
                item.open(true);
            }
            else if (item instanceof BaseMenuActionViewItem) {
                super.run(item._action, item._context);
            }
            else {
                return;
            }
        }
    }
    focusItemByElement(element) {
        const lastFocusedItem = this.focusedItem;
        this.setFocusedItem(element);
        if (lastFocusedItem !== this.focusedItem) {
            this.updateFocus();
        }
    }
    setFocusedItem(element) {
        for (let i = 0; i < this.actionsList.children.length; i++) {
            const elem = this.actionsList.children[i];
            if (element === elem) {
                this.focusedItem = i;
                break;
            }
        }
    }
    updateFocus(fromRight) {
        super.updateFocus(fromRight, true, true);
        if (typeof this.focusedItem !== 'undefined') {
            // Workaround for #80047 caused by an issue in chromium
            // https://bugs.chromium.org/p/chromium/issues/detail?id=414283
            // When that's fixed, just call this.scrollableElement.scanDomNode()
            this.scrollableElement.setScrollPosition({
                scrollTop: Math.round(this.menuElement.scrollTop),
            });
        }
    }
    doGetActionViewItem(action, options, parentData) {
        if (action instanceof Separator) {
            return new MenuSeparatorActionViewItem(options.context, action, { icon: true }, this.menuStyles);
        }
        else if (action instanceof SubmenuAction) {
            const menuActionViewItem = new SubmenuMenuActionViewItem(action, action.actions, parentData, { ...options, submenuIds: new Set([...(options.submenuIds || []), action.id]) }, this.menuStyles);
            if (options.enableMnemonics) {
                const mnemonic = menuActionViewItem.getMnemonic();
                if (mnemonic && menuActionViewItem.isEnabled()) {
                    let actionViewItems = [];
                    if (this.mnemonics.has(mnemonic)) {
                        actionViewItems = this.mnemonics.get(mnemonic);
                    }
                    actionViewItems.push(menuActionViewItem);
                    this.mnemonics.set(mnemonic, actionViewItems);
                }
            }
            return menuActionViewItem;
        }
        else {
            const menuItemOptions = {
                enableMnemonics: options.enableMnemonics,
                useEventAsContext: options.useEventAsContext,
            };
            if (options.getKeyBinding) {
                const keybinding = options.getKeyBinding(action);
                if (keybinding) {
                    const keybindingLabel = keybinding.getLabel();
                    if (keybindingLabel) {
                        menuItemOptions.keybinding = keybindingLabel;
                    }
                }
            }
            const menuActionViewItem = new BaseMenuActionViewItem(options.context, action, menuItemOptions, this.menuStyles);
            if (options.enableMnemonics) {
                const mnemonic = menuActionViewItem.getMnemonic();
                if (mnemonic && menuActionViewItem.isEnabled()) {
                    let actionViewItems = [];
                    if (this.mnemonics.has(mnemonic)) {
                        actionViewItems = this.mnemonics.get(mnemonic);
                    }
                    actionViewItems.push(menuActionViewItem);
                    this.mnemonics.set(mnemonic, actionViewItems);
                }
            }
            return menuActionViewItem;
        }
    }
}
class BaseMenuActionViewItem extends BaseActionViewItem {
    constructor(ctx, action, options, menuStyle) {
        options.isMenu = true;
        super(action, action, options);
        this.menuStyle = menuStyle;
        this.options = options;
        this.options.icon = options.icon !== undefined ? options.icon : false;
        this.options.label = options.label !== undefined ? options.label : true;
        this.cssClass = '';
        // Set mnemonic
        if (this.options.label && options.enableMnemonics) {
            const label = this.action.label;
            if (label) {
                const matches = MENU_MNEMONIC_REGEX.exec(label);
                if (matches) {
                    this.mnemonic = (!!matches[1] ? matches[1] : matches[3]).toLocaleLowerCase();
                }
            }
        }
        // Add mouse up listener later to avoid accidental clicks
        this.runOnceToEnableMouseUp = new RunOnceScheduler(() => {
            if (!this.element) {
                return;
            }
            this._register(addDisposableListener(this.element, EventType.MOUSE_UP, (e) => {
                // removed default prevention as it conflicts
                // with BaseActionViewItem #101537
                // add back if issues arise and link new issue
                EventHelper.stop(e, true);
                // See https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Interact_with_the_clipboard
                // > Writing to the clipboard
                // > You can use the "cut" and "copy" commands without any special
                // permission if you are using them in a short-lived event handler
                // for a user action (for example, a click handler).
                // => to get the Copy and Paste context menu actions working on Firefox,
                // there should be no timeout here
                if (isFirefox) {
                    const mouseEvent = new StandardMouseEvent(getWindow(this.element), e);
                    // Allowing right click to trigger the event causes the issue described below,
                    // but since the solution below does not work in FF, we must disable right click
                    if (mouseEvent.rightButton) {
                        return;
                    }
                    this.onClick(e);
                }
                // In all other cases, set timeout to allow context menu cancellation to trigger
                // otherwise the action will destroy the menu and a second context menu
                // will still trigger for right click.
                else {
                    setTimeout(() => {
                        this.onClick(e);
                    }, 0);
                }
            }));
            this._register(addDisposableListener(this.element, EventType.CONTEXT_MENU, (e) => {
                EventHelper.stop(e, true);
            }));
        }, 100);
        this._register(this.runOnceToEnableMouseUp);
    }
    render(container) {
        super.render(container);
        if (!this.element) {
            return;
        }
        this.container = container;
        this.item = append(this.element, $('a.action-menu-item'));
        if (this._action.id === Separator.ID) {
            // A separator is a presentation item
            this.item.setAttribute('role', 'presentation');
        }
        else {
            this.item.setAttribute('role', 'menuitem');
            if (this.mnemonic) {
                this.item.setAttribute('aria-keyshortcuts', `${this.mnemonic}`);
            }
        }
        this.check = append(this.item, $('span.menu-item-check' + ThemeIcon.asCSSSelector(Codicon.menuSelection)));
        this.check.setAttribute('role', 'none');
        this.label = append(this.item, $('span.action-label'));
        if (this.options.label && this.options.keybinding) {
            append(this.item, $('span.keybinding')).textContent = this.options.keybinding;
        }
        // Adds mouse up listener to actually run the action
        this.runOnceToEnableMouseUp.schedule();
        this.updateClass();
        this.updateLabel();
        this.updateTooltip();
        this.updateEnabled();
        this.updateChecked();
        this.applyStyle();
    }
    blur() {
        super.blur();
        this.applyStyle();
    }
    focus() {
        super.focus();
        this.item?.focus();
        this.applyStyle();
    }
    updatePositionInSet(pos, setSize) {
        if (this.item) {
            this.item.setAttribute('aria-posinset', `${pos}`);
            this.item.setAttribute('aria-setsize', `${setSize}`);
        }
    }
    updateLabel() {
        if (!this.label) {
            return;
        }
        if (this.options.label) {
            clearNode(this.label);
            let label = stripIcons(this.action.label);
            if (label) {
                const cleanLabel = cleanMnemonic(label);
                if (!this.options.enableMnemonics) {
                    label = cleanLabel;
                }
                this.label.setAttribute('aria-label', cleanLabel.replace(/&&/g, '&'));
                const matches = MENU_MNEMONIC_REGEX.exec(label);
                if (matches) {
                    label = strings.escape(label);
                    // This is global, reset it
                    MENU_ESCAPED_MNEMONIC_REGEX.lastIndex = 0;
                    let escMatch = MENU_ESCAPED_MNEMONIC_REGEX.exec(label);
                    // We can't use negative lookbehind so if we match our negative and skip
                    while (escMatch && escMatch[1]) {
                        escMatch = MENU_ESCAPED_MNEMONIC_REGEX.exec(label);
                    }
                    const replaceDoubleEscapes = (str) => str.replace(/&amp;&amp;/g, '&amp;');
                    if (escMatch) {
                        this.label.append(strings.ltrim(replaceDoubleEscapes(label.substr(0, escMatch.index)), ' '), $('u', { 'aria-hidden': 'true' }, escMatch[3]), strings.rtrim(replaceDoubleEscapes(label.substr(escMatch.index + escMatch[0].length)), ' '));
                    }
                    else {
                        this.label.innerText = replaceDoubleEscapes(label).trim();
                    }
                    this.item?.setAttribute('aria-keyshortcuts', (!!matches[1] ? matches[1] : matches[3]).toLocaleLowerCase());
                }
                else {
                    this.label.innerText = label.replace(/&&/g, '&').trim();
                }
            }
        }
    }
    updateTooltip() {
        // menus should function like native menus and they do not have tooltips
    }
    updateClass() {
        if (this.cssClass && this.item) {
            this.item.classList.remove(...this.cssClass.split(' '));
        }
        if (this.options.icon && this.label) {
            this.cssClass = this.action.class || '';
            this.label.classList.add('icon');
            if (this.cssClass) {
                this.label.classList.add(...this.cssClass.split(' '));
            }
            this.updateEnabled();
        }
        else if (this.label) {
            this.label.classList.remove('icon');
        }
    }
    updateEnabled() {
        if (this.action.enabled) {
            if (this.element) {
                this.element.classList.remove('disabled');
                this.element.removeAttribute('aria-disabled');
            }
            if (this.item) {
                this.item.classList.remove('disabled');
                this.item.removeAttribute('aria-disabled');
                this.item.tabIndex = 0;
            }
        }
        else {
            if (this.element) {
                this.element.classList.add('disabled');
                this.element.setAttribute('aria-disabled', 'true');
            }
            if (this.item) {
                this.item.classList.add('disabled');
                this.item.setAttribute('aria-disabled', 'true');
            }
        }
    }
    updateChecked() {
        if (!this.item) {
            return;
        }
        const checked = this.action.checked;
        this.item.classList.toggle('checked', !!checked);
        if (checked !== undefined) {
            this.item.setAttribute('role', 'menuitemcheckbox');
            this.item.setAttribute('aria-checked', checked ? 'true' : 'false');
        }
        else {
            this.item.setAttribute('role', 'menuitem');
            this.item.setAttribute('aria-checked', '');
        }
    }
    getMnemonic() {
        return this.mnemonic;
    }
    applyStyle() {
        const isSelected = this.element && this.element.classList.contains('focused');
        const fgColor = isSelected && this.menuStyle.selectionForegroundColor
            ? this.menuStyle.selectionForegroundColor
            : this.menuStyle.foregroundColor;
        const bgColor = isSelected && this.menuStyle.selectionBackgroundColor
            ? this.menuStyle.selectionBackgroundColor
            : undefined;
        const outline = isSelected && this.menuStyle.selectionBorderColor
            ? `1px solid ${this.menuStyle.selectionBorderColor}`
            : '';
        const outlineOffset = isSelected && this.menuStyle.selectionBorderColor ? `-1px` : '';
        if (this.item) {
            this.item.style.color = fgColor ?? '';
            this.item.style.backgroundColor = bgColor ?? '';
            this.item.style.outline = outline;
            this.item.style.outlineOffset = outlineOffset;
        }
        if (this.check) {
            this.check.style.color = fgColor ?? '';
        }
    }
}
class SubmenuMenuActionViewItem extends BaseMenuActionViewItem {
    constructor(action, submenuActions, parentData, submenuOptions, menuStyles) {
        super(action, action, submenuOptions, menuStyles);
        this.submenuActions = submenuActions;
        this.parentData = parentData;
        this.submenuOptions = submenuOptions;
        this.mysubmenu = null;
        this.submenuDisposables = this._register(new DisposableStore());
        this.mouseOver = false;
        this.expandDirection =
            submenuOptions && submenuOptions.expandDirection !== undefined
                ? submenuOptions.expandDirection
                : { horizontal: HorizontalDirection.Right, vertical: VerticalDirection.Below };
        this.showScheduler = new RunOnceScheduler(() => {
            if (this.mouseOver) {
                this.cleanupExistingSubmenu(false);
                this.createSubmenu(false);
            }
        }, 250);
        this.hideScheduler = new RunOnceScheduler(() => {
            if (this.element &&
                !isAncestor(getActiveElement(), this.element) &&
                this.parentData.submenu === this.mysubmenu) {
                this.parentData.parent.focus(false);
                this.cleanupExistingSubmenu(true);
            }
        }, 750);
    }
    render(container) {
        super.render(container);
        if (!this.element) {
            return;
        }
        if (this.item) {
            this.item.classList.add('monaco-submenu-item');
            this.item.tabIndex = 0;
            this.item.setAttribute('aria-haspopup', 'true');
            this.updateAriaExpanded('false');
            this.submenuIndicator = append(this.item, $('span.submenu-indicator' + ThemeIcon.asCSSSelector(Codicon.menuSubmenu)));
            this.submenuIndicator.setAttribute('aria-hidden', 'true');
        }
        this._register(addDisposableListener(this.element, EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(17 /* KeyCode.RightArrow */) || event.equals(3 /* KeyCode.Enter */)) {
                EventHelper.stop(e, true);
                this.createSubmenu(true);
            }
        }));
        this._register(addDisposableListener(this.element, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (getActiveElement() === this.item) {
                if (event.equals(17 /* KeyCode.RightArrow */) || event.equals(3 /* KeyCode.Enter */)) {
                    EventHelper.stop(e, true);
                }
            }
        }));
        this._register(addDisposableListener(this.element, EventType.MOUSE_OVER, (e) => {
            if (!this.mouseOver) {
                this.mouseOver = true;
                this.showScheduler.schedule();
            }
        }));
        this._register(addDisposableListener(this.element, EventType.MOUSE_LEAVE, (e) => {
            this.mouseOver = false;
        }));
        this._register(addDisposableListener(this.element, EventType.FOCUS_OUT, (e) => {
            if (this.element && !isAncestor(getActiveElement(), this.element)) {
                this.hideScheduler.schedule();
            }
        }));
        this._register(this.parentData.parent.onScroll(() => {
            if (this.parentData.submenu === this.mysubmenu) {
                this.parentData.parent.focus(false);
                this.cleanupExistingSubmenu(true);
            }
        }));
    }
    updateEnabled() {
        // override on submenu entry
        // native menus do not observe enablement on sumbenus
        // we mimic that behavior
    }
    open(selectFirst) {
        this.cleanupExistingSubmenu(false);
        this.createSubmenu(selectFirst);
    }
    onClick(e) {
        // stop clicking from trying to run an action
        EventHelper.stop(e, true);
        this.cleanupExistingSubmenu(false);
        this.createSubmenu(true);
    }
    cleanupExistingSubmenu(force) {
        if (this.parentData.submenu && (force || this.parentData.submenu !== this.mysubmenu)) {
            // disposal may throw if the submenu has already been removed
            try {
                this.parentData.submenu.dispose();
            }
            catch { }
            this.parentData.submenu = undefined;
            this.updateAriaExpanded('false');
            if (this.submenuContainer) {
                this.submenuDisposables.clear();
                this.submenuContainer = undefined;
            }
        }
    }
    calculateSubmenuMenuLayout(windowDimensions, submenu, entry, expandDirection) {
        const ret = { top: 0, left: 0 };
        // Start with horizontal
        ret.left = layout(windowDimensions.width, submenu.width, {
            position: expandDirection.horizontal === HorizontalDirection.Right
                ? 0 /* LayoutAnchorPosition.Before */
                : 1 /* LayoutAnchorPosition.After */,
            offset: entry.left,
            size: entry.width,
        });
        // We don't have enough room to layout the menu fully, so we are overlapping the menu
        if (ret.left >= entry.left && ret.left < entry.left + entry.width) {
            if (entry.left + 10 + submenu.width <= windowDimensions.width) {
                ret.left = entry.left + 10;
            }
            entry.top += 10;
            entry.height = 0;
        }
        // Now that we have a horizontal position, try layout vertically
        ret.top = layout(windowDimensions.height, submenu.height, {
            position: 0 /* LayoutAnchorPosition.Before */,
            offset: entry.top,
            size: 0,
        });
        // We didn't have enough room below, but we did above, so we shift down to align the menu
        if (ret.top + submenu.height === entry.top &&
            ret.top + entry.height + submenu.height <= windowDimensions.height) {
            ret.top += entry.height;
        }
        return ret;
    }
    createSubmenu(selectFirstItem = true) {
        if (!this.element) {
            return;
        }
        if (!this.parentData.submenu) {
            this.updateAriaExpanded('true');
            this.submenuContainer = append(this.element, $('div.monaco-submenu'));
            this.submenuContainer.classList.add('menubar-menu-items-holder', 'context-view');
            // Set the top value of the menu container before construction
            // This allows the menu constructor to calculate the proper max height
            const computedStyles = getWindow(this.parentData.parent.domNode).getComputedStyle(this.parentData.parent.domNode);
            const paddingTop = parseFloat(computedStyles.paddingTop || '0') || 0;
            this.submenuContainer.style.position = 'fixed';
            this.submenuContainer.style.top = '0';
            this.submenuContainer.style.left = '0';
            this.parentData.submenu = new Menu(this.submenuContainer, this.submenuActions.length ? this.submenuActions : [new EmptySubmenuAction()], this.submenuOptions, this.menuStyle);
            // layout submenu
            const entryBox = this.element.getBoundingClientRect();
            const entryBoxUpdated = {
                top: entryBox.top - paddingTop,
                left: entryBox.left,
                height: entryBox.height + 2 * paddingTop,
                width: entryBox.width,
            };
            const viewBox = this.submenuContainer.getBoundingClientRect();
            const window = getWindow(this.element);
            const { top, left } = this.calculateSubmenuMenuLayout(new Dimension(window.innerWidth, window.innerHeight), Dimension.lift(viewBox), entryBoxUpdated, this.expandDirection);
            // subtract offsets caused by transform parent
            this.submenuContainer.style.left = `${left - viewBox.left}px`;
            this.submenuContainer.style.top = `${top - viewBox.top}px`;
            this.submenuDisposables.add(addDisposableListener(this.submenuContainer, EventType.KEY_UP, (e) => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(15 /* KeyCode.LeftArrow */)) {
                    EventHelper.stop(e, true);
                    this.parentData.parent.focus();
                    this.cleanupExistingSubmenu(true);
                }
            }));
            this.submenuDisposables.add(addDisposableListener(this.submenuContainer, EventType.KEY_DOWN, (e) => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(15 /* KeyCode.LeftArrow */)) {
                    EventHelper.stop(e, true);
                }
            }));
            this.submenuDisposables.add(this.parentData.submenu.onDidCancel(() => {
                this.parentData.parent.focus();
                this.cleanupExistingSubmenu(true);
            }));
            this.parentData.submenu.focus(selectFirstItem);
            this.mysubmenu = this.parentData.submenu;
        }
        else {
            this.parentData.submenu.focus(false);
        }
    }
    updateAriaExpanded(value) {
        if (this.item) {
            this.item?.setAttribute('aria-expanded', value);
        }
    }
    applyStyle() {
        super.applyStyle();
        const isSelected = this.element && this.element.classList.contains('focused');
        const fgColor = isSelected && this.menuStyle.selectionForegroundColor
            ? this.menuStyle.selectionForegroundColor
            : this.menuStyle.foregroundColor;
        if (this.submenuIndicator) {
            this.submenuIndicator.style.color = fgColor ?? '';
        }
    }
    dispose() {
        super.dispose();
        this.hideScheduler.dispose();
        if (this.mysubmenu) {
            this.mysubmenu.dispose();
            this.mysubmenu = null;
        }
        if (this.submenuContainer) {
            this.submenuContainer = undefined;
        }
    }
}
class MenuSeparatorActionViewItem extends ActionViewItem {
    constructor(context, action, options, menuStyles) {
        super(context, action, options);
        this.menuStyles = menuStyles;
    }
    render(container) {
        super.render(container);
        if (this.label) {
            this.label.style.borderBottomColor = this.menuStyles.separatorColor
                ? `${this.menuStyles.separatorColor}`
                : '';
        }
    }
}
export function cleanMnemonic(label) {
    const regex = MENU_MNEMONIC_REGEX;
    const matches = regex.exec(label);
    if (!matches) {
        return label;
    }
    const mnemonicInText = !matches[1];
    return label.replace(regex, mnemonicInText ? '$2$3' : '').trim();
}
export function formatRule(c) {
    const fontCharacter = getCodiconFontCharacters()[c.id];
    return `.codicon-${c.id}:before { content: '\\${fontCharacter.toString(16)}'; }`;
}
function getMenuWidgetCSS(style, isForShadowDom) {
    let result = /* css */ `
.monaco-menu {
	font-size: 13px;
	border-radius: 5px;
	min-width: 160px;
}

${formatRule(Codicon.menuSelection)}
${formatRule(Codicon.menuSubmenu)}

.monaco-menu .monaco-action-bar {
	text-align: right;
	overflow: hidden;
	white-space: nowrap;
}

.monaco-menu .monaco-action-bar .actions-container {
	display: flex;
	margin: 0 auto;
	padding: 0;
	width: 100%;
	justify-content: flex-end;
}

.monaco-menu .monaco-action-bar.vertical .actions-container {
	display: inline-block;
}

.monaco-menu .monaco-action-bar.reverse .actions-container {
	flex-direction: row-reverse;
}

.monaco-menu .monaco-action-bar .action-item {
	cursor: pointer;
	display: inline-block;
	transition: transform 50ms ease;
	position: relative;  /* DO NOT REMOVE - this is the key to preventing the ghosting icon bug in Chrome 42 */
}

.monaco-menu .monaco-action-bar .action-item.disabled {
	cursor: default;
}

.monaco-menu .monaco-action-bar .action-item .icon,
.monaco-menu .monaco-action-bar .action-item .codicon {
	display: inline-block;
}

.monaco-menu .monaco-action-bar .action-item .codicon {
	display: flex;
	align-items: center;
}

.monaco-menu .monaco-action-bar .action-label {
	font-size: 11px;
	margin-right: 4px;
}

.monaco-menu .monaco-action-bar .action-item.disabled .action-label,
.monaco-menu .monaco-action-bar .action-item.disabled .action-label:hover {
	color: var(--vscode-disabledForeground);
}

/* Vertical actions */

.monaco-menu .monaco-action-bar.vertical {
	text-align: left;
}

.monaco-menu .monaco-action-bar.vertical .action-item {
	display: block;
}

.monaco-menu .monaco-action-bar.vertical .action-label.separator {
	display: block;
	border-bottom: 1px solid var(--vscode-menu-separatorBackground);
	padding-top: 1px;
	padding: 30px;
}

.monaco-menu .secondary-actions .monaco-action-bar .action-label {
	margin-left: 6px;
}

/* Action Items */
.monaco-menu .monaco-action-bar .action-item.select-container {
	overflow: hidden; /* somehow the dropdown overflows its container, we prevent it here to not push */
	flex: 1;
	max-width: 170px;
	min-width: 60px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 10px;
}

.monaco-menu .monaco-action-bar.vertical {
	margin-left: 0;
	overflow: visible;
}

.monaco-menu .monaco-action-bar.vertical .actions-container {
	display: block;
}

.monaco-menu .monaco-action-bar.vertical .action-item {
	padding: 0;
	transform: none;
	display: flex;
}

.monaco-menu .monaco-action-bar.vertical .action-item.active {
	transform: none;
}

.monaco-menu .monaco-action-bar.vertical .action-menu-item {
	flex: 1 1 auto;
	display: flex;
	height: 2em;
	align-items: center;
	position: relative;
	margin: 0 4px;
	border-radius: 4px;
}

.monaco-menu .monaco-action-bar.vertical .action-menu-item:hover .keybinding,
.monaco-menu .monaco-action-bar.vertical .action-menu-item:focus .keybinding {
	opacity: unset;
}

.monaco-menu .monaco-action-bar.vertical .action-label {
	flex: 1 1 auto;
	text-decoration: none;
	padding: 0 1em;
	background: none;
	font-size: 12px;
	line-height: 1;
}

.monaco-menu .monaco-action-bar.vertical .keybinding,
.monaco-menu .monaco-action-bar.vertical .submenu-indicator {
	display: inline-block;
	flex: 2 1 auto;
	padding: 0 1em;
	text-align: right;
	font-size: 12px;
	line-height: 1;
	opacity: 0.7;
}

.monaco-menu .monaco-action-bar.vertical .submenu-indicator {
	height: 100%;
}

.monaco-menu .monaco-action-bar.vertical .submenu-indicator.codicon {
	font-size: 16px !important;
	display: flex;
	align-items: center;
}

.monaco-menu .monaco-action-bar.vertical .submenu-indicator.codicon::before {
	margin-left: auto;
	margin-right: -20px;
}

.monaco-menu .monaco-action-bar.vertical .action-item.disabled .keybinding,
.monaco-menu .monaco-action-bar.vertical .action-item.disabled .submenu-indicator {
	opacity: 0.4;
}

.monaco-menu .monaco-action-bar.vertical .action-label:not(.separator) {
	display: inline-block;
	box-sizing: border-box;
	margin: 0;
}

.monaco-menu .monaco-action-bar.vertical .action-item {
	position: static;
	overflow: visible;
}

.monaco-menu .monaco-action-bar.vertical .action-item .monaco-submenu {
	position: absolute;
}

.monaco-menu .monaco-action-bar.vertical .action-label.separator {
	width: 100%;
	height: 0px !important;
	opacity: 1;
}

.monaco-menu .monaco-action-bar.vertical .action-label.separator.text {
	padding: 0.7em 1em 0.1em 1em;
	font-weight: bold;
	opacity: 1;
}

.monaco-menu .monaco-action-bar.vertical .action-label:hover {
	color: inherit;
}

.monaco-menu .monaco-action-bar.vertical .menu-item-check {
	position: absolute;
	visibility: hidden;
	width: 1em;
	height: 100%;
}

.monaco-menu .monaco-action-bar.vertical .action-menu-item.checked .menu-item-check {
	visibility: visible;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* Context Menu */

.context-view.monaco-menu-container {
	outline: 0;
	border: none;
	animation: fadeIn 0.083s linear;
	-webkit-app-region: no-drag;
}

.context-view.monaco-menu-container :focus,
.context-view.monaco-menu-container .monaco-action-bar.vertical:focus,
.context-view.monaco-menu-container .monaco-action-bar.vertical :focus {
	outline: 0;
}

.hc-black .context-view.monaco-menu-container,
.hc-light .context-view.monaco-menu-container,
:host-context(.hc-black) .context-view.monaco-menu-container,
:host-context(.hc-light) .context-view.monaco-menu-container {
	box-shadow: none;
}

.hc-black .monaco-menu .monaco-action-bar.vertical .action-item.focused,
.hc-light .monaco-menu .monaco-action-bar.vertical .action-item.focused,
:host-context(.hc-black) .monaco-menu .monaco-action-bar.vertical .action-item.focused,
:host-context(.hc-light) .monaco-menu .monaco-action-bar.vertical .action-item.focused {
	background: none;
}

/* Vertical Action Bar Styles */

.monaco-menu .monaco-action-bar.vertical {
	padding: 4px 0;
}

.monaco-menu .monaco-action-bar.vertical .action-menu-item {
	height: 2em;
}

.monaco-menu .monaco-action-bar.vertical .action-label:not(.separator),
.monaco-menu .monaco-action-bar.vertical .keybinding {
	font-size: inherit;
	padding: 0 2em;
	max-height: 100%;
}

.monaco-menu .monaco-action-bar.vertical .menu-item-check {
	font-size: inherit;
	width: 2em;
}

.monaco-menu .monaco-action-bar.vertical .action-label.separator {
	font-size: inherit;
	margin: 5px 0 !important;
	padding: 0;
	border-radius: 0;
}

.linux .monaco-menu .monaco-action-bar.vertical .action-label.separator,
:host-context(.linux) .monaco-menu .monaco-action-bar.vertical .action-label.separator {
	margin-left: 0;
	margin-right: 0;
}

.monaco-menu .monaco-action-bar.vertical .submenu-indicator {
	font-size: 60%;
	padding: 0 1.8em;
}

.linux .monaco-menu .monaco-action-bar.vertical .submenu-indicator,
:host-context(.linux) .monaco-menu .monaco-action-bar.vertical .submenu-indicator {
	height: 100%;
	mask-size: 10px 10px;
	-webkit-mask-size: 10px 10px;
}

.monaco-menu .action-item {
	cursor: default;
}`;
    if (isForShadowDom) {
        // Only define scrollbar styles when used inside shadow dom,
        // otherwise leave their styling to the global workbench styling.
        result += `
			/* Arrows */
			.monaco-scrollable-element > .scrollbar > .scra {
				cursor: pointer;
				font-size: 11px !important;
			}

			.monaco-scrollable-element > .visible {
				opacity: 1;

				/* Background rule added for IE9 - to allow clicks on dom node */
				background:rgba(0,0,0,0);

				transition: opacity 100ms linear;
			}
			.monaco-scrollable-element > .invisible {
				opacity: 0;
				pointer-events: none;
			}
			.monaco-scrollable-element > .invisible.fade {
				transition: opacity 800ms linear;
			}

			/* Scrollable Content Inset Shadow */
			.monaco-scrollable-element > .shadow {
				position: absolute;
				display: none;
			}
			.monaco-scrollable-element > .shadow.top {
				display: block;
				top: 0;
				left: 3px;
				height: 3px;
				width: 100%;
			}
			.monaco-scrollable-element > .shadow.left {
				display: block;
				top: 3px;
				left: 0;
				height: 100%;
				width: 3px;
			}
			.monaco-scrollable-element > .shadow.top-left-corner {
				display: block;
				top: 0;
				left: 0;
				height: 3px;
				width: 3px;
			}
			/* Fix for https://github.com/microsoft/vscode/issues/103170 */
			.monaco-menu .action-item .monaco-submenu {
				z-index: 1;
			}
		`;
        // Scrollbars
        const scrollbarShadowColor = style.scrollbarShadow;
        if (scrollbarShadowColor) {
            result += `
				.monaco-scrollable-element > .shadow.top {
					box-shadow: ${scrollbarShadowColor} 0 6px 6px -6px inset;
				}

				.monaco-scrollable-element > .shadow.left {
					box-shadow: ${scrollbarShadowColor} 6px 0 6px -6px inset;
				}

				.monaco-scrollable-element > .shadow.top.left {
					box-shadow: ${scrollbarShadowColor} 6px 6px 6px -6px inset;
				}
			`;
        }
        const scrollbarSliderBackgroundColor = style.scrollbarSliderBackground;
        if (scrollbarSliderBackgroundColor) {
            result += `
				.monaco-scrollable-element > .scrollbar > .slider {
					background: ${scrollbarSliderBackgroundColor};
				}
			`;
        }
        const scrollbarSliderHoverBackgroundColor = style.scrollbarSliderHoverBackground;
        if (scrollbarSliderHoverBackgroundColor) {
            result += `
				.monaco-scrollable-element > .scrollbar > .slider:hover {
					background: ${scrollbarSliderHoverBackgroundColor};
				}
			`;
        }
        const scrollbarSliderActiveBackgroundColor = style.scrollbarSliderActiveBackground;
        if (scrollbarSliderActiveBackgroundColor) {
            result += `
				.monaco-scrollable-element > .scrollbar > .slider.active {
					background: ${scrollbarSliderActiveBackgroundColor};
				}
			`;
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL21lbnUvbWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDNUMsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDckUsT0FBTyxFQUNOLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsTUFBTSxFQUNOLFNBQVMsRUFDVCxTQUFTLEVBQ1QsV0FBVyxFQUVYLFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIsU0FBUyxFQUVULFVBQVUsRUFDVixhQUFhLEdBQ2IsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBK0MsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixHQUVsQixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBbUIsTUFBTSxFQUF3QixNQUFNLCtCQUErQixDQUFBO0FBQzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixrQkFBa0IsRUFHbEIsU0FBUyxFQUNULGFBQWEsR0FDYixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2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