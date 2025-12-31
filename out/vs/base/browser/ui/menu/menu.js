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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9tZW51L21lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzVDLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ3JFLE9BQU8sRUFDTixDQUFDLEVBQ0QscUJBQXFCLEVBQ3JCLE1BQU0sRUFDTixTQUFTLEVBQ1QsU0FBUyxFQUNULFdBQVcsRUFFWCxTQUFTLEVBQ1QsZ0JBQWdCLEVBQ2hCLFNBQVMsRUFFVCxVQUFVLEVBQ1YsYUFBYSxHQUNiLE1BQU0sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQStDLE1BQU0sMkJBQTJCLENBQUE7QUFDbEcsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsR0FFbEIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQW1CLE1BQU0sRUFBd0IsTUFBTSwrQkFBK0IsQ0FBQTtBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sa0JBQWtCLEVBR2xCLFNBQVMsRUFDVCxhQUFhLEdBQ2IsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZC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