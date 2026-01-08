/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from '../../browser.js';
import * as DOM from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { StandardMouseEvent } from '../../mouseEvent.js';
import { EventType, Gesture } from '../../touch.js';
import { cleanMnemonic, HorizontalDirection, Menu, MENU_ESCAPED_MNEMONIC_REGEX, MENU_MNEMONIC_REGEX, VerticalDirection, } from './menu.js';
import { ActionRunner, Separator, SubmenuAction, } from '../../../common/actions.js';
import { asArray } from '../../../common/arrays.js';
import { RunOnceScheduler } from '../../../common/async.js';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import { Emitter } from '../../../common/event.js';
import { ScanCodeUtils } from '../../../common/keyCodes.js';
import { Disposable, DisposableStore, dispose } from '../../../common/lifecycle.js';
import { isMacintosh } from '../../../common/platform.js';
import * as strings from '../../../common/strings.js';
import './menubar.css';
import * as nls from '../../../../nls.js';
import { mainWindow } from '../../window.js';
const $ = DOM.$;
var MenubarState;
(function (MenubarState) {
    MenubarState[MenubarState["HIDDEN"] = 0] = "HIDDEN";
    MenubarState[MenubarState["VISIBLE"] = 1] = "VISIBLE";
    MenubarState[MenubarState["FOCUSED"] = 2] = "FOCUSED";
    MenubarState[MenubarState["OPEN"] = 3] = "OPEN";
})(MenubarState || (MenubarState = {}));
export class MenuBar extends Disposable {
    static { this.OVERFLOW_INDEX = -1; }
    constructor(container, options, menuStyle) {
        super();
        this.container = container;
        this.options = options;
        this.menuStyle = menuStyle;
        // Input-related
        this._mnemonicsInUse = false;
        this.openedViaKeyboard = false;
        this.awaitingAltRelease = false;
        this.ignoreNextMouseUp = false;
        this.updatePending = false;
        this.numMenusShown = 0;
        this.overflowLayoutScheduled = undefined;
        this.menuDisposables = this._register(new DisposableStore());
        this.container.setAttribute('role', 'menubar');
        if (this.isCompact) {
            this.container.classList.add('compact');
        }
        this.menus = [];
        this.mnemonics = new Map();
        this._focusState = MenubarState.VISIBLE;
        this._onVisibilityChange = this._register(new Emitter());
        this._onFocusStateChange = this._register(new Emitter());
        this.createOverflowMenu();
        this.menuUpdater = this._register(new RunOnceScheduler(() => this.update(), 200));
        this.actionRunner = this.options.actionRunner ?? this._register(new ActionRunner());
        this._register(this.actionRunner.onWillRun(() => {
            this.setUnfocusedState();
        }));
        this._register(DOM.ModifierKeyEmitter.getInstance().event(this.onModifierKeyToggled, this));
        this._register(DOM.addDisposableListener(this.container, DOM.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = true;
            const key = !!e.key ? e.key.toLocaleLowerCase() : '';
            const tabNav = isMacintosh && !this.isCompact;
            if (event.equals(15 /* KeyCode.LeftArrow */) ||
                (tabNav && event.equals(2 /* KeyCode.Tab */ | 1024 /* KeyMod.Shift */))) {
                this.focusPrevious();
            }
            else if (event.equals(17 /* KeyCode.RightArrow */) || (tabNav && event.equals(2 /* KeyCode.Tab */))) {
                this.focusNext();
            }
            else if (event.equals(9 /* KeyCode.Escape */) && this.isFocused && !this.isOpen) {
                this.setUnfocusedState();
            }
            else if (!this.isOpen &&
                !event.ctrlKey &&
                this.options.enableMnemonics &&
                this.mnemonicsInUse &&
                this.mnemonics.has(key)) {
                const menuIndex = this.mnemonics.get(key);
                this.onMenuTriggered(menuIndex, false);
            }
            else {
                eventHandled = false;
            }
            // Never allow default tab behavior when not compact
            if (!this.isCompact &&
                (event.equals(2 /* KeyCode.Tab */ | 1024 /* KeyMod.Shift */) || event.equals(2 /* KeyCode.Tab */))) {
                event.preventDefault();
            }
            if (eventHandled) {
                event.preventDefault();
                event.stopPropagation();
            }
        }));
        const window = DOM.getWindow(this.container);
        this._register(DOM.addDisposableListener(window, DOM.EventType.MOUSE_DOWN, () => {
            // This mouse event is outside the menubar so it counts as a focus out
            if (this.isFocused) {
                this.setUnfocusedState();
            }
        }));
        this._register(DOM.addDisposableListener(this.container, DOM.EventType.FOCUS_IN, (e) => {
            const event = e;
            if (event.relatedTarget) {
                if (!this.container.contains(event.relatedTarget)) {
                    this.focusToReturn = event.relatedTarget;
                }
            }
        }));
        this._register(DOM.addDisposableListener(this.container, DOM.EventType.FOCUS_OUT, (e) => {
            const event = e;
            // We are losing focus and there is no related target, e.g. webview case
            if (!event.relatedTarget) {
                this.setUnfocusedState();
            }
            // We are losing focus and there is a target, reset focusToReturn value as not to redirect
            else if (event.relatedTarget &&
                !this.container.contains(event.relatedTarget)) {
                this.focusToReturn = undefined;
                this.setUnfocusedState();
            }
        }));
        this._register(DOM.addDisposableListener(window, DOM.EventType.KEY_DOWN, (e) => {
            if (!this.options.enableMnemonics || !e.altKey || e.ctrlKey || e.defaultPrevented) {
                return;
            }
            const key = e.key.toLocaleLowerCase();
            if (!this.mnemonics.has(key)) {
                return;
            }
            this.mnemonicsInUse = true;
            this.updateMnemonicVisibility(true);
            const menuIndex = this.mnemonics.get(key);
            this.onMenuTriggered(menuIndex, false);
        }));
        this.setUnfocusedState();
    }
    push(arg) {
        const menus = asArray(arg);
        menus.forEach((menuBarMenu) => {
            const menuIndex = this.menus.length;
            const cleanMenuLabel = cleanMnemonic(menuBarMenu.label);
            const mnemonicMatches = MENU_MNEMONIC_REGEX.exec(menuBarMenu.label);
            // Register mnemonics
            if (mnemonicMatches) {
                const mnemonic = !!mnemonicMatches[1] ? mnemonicMatches[1] : mnemonicMatches[3];
                this.registerMnemonic(this.menus.length, mnemonic);
            }
            if (this.isCompact) {
                this.menus.push(menuBarMenu);
            }
            else {
                const buttonElement = $('div.menubar-menu-button', {
                    role: 'menuitem',
                    tabindex: -1,
                    'aria-label': cleanMenuLabel,
                    'aria-haspopup': true,
                });
                const titleElement = $('div.menubar-menu-title', { role: 'none', 'aria-hidden': true });
                buttonElement.appendChild(titleElement);
                this.container.insertBefore(buttonElement, this.overflowMenu.buttonElement);
                this.updateLabels(titleElement, buttonElement, menuBarMenu.label);
                this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.KEY_UP, (e) => {
                    const event = new StandardKeyboardEvent(e);
                    let eventHandled = true;
                    if ((event.equals(18 /* KeyCode.DownArrow */) || event.equals(3 /* KeyCode.Enter */)) && !this.isOpen) {
                        this.focusedMenu = { index: menuIndex };
                        this.openedViaKeyboard = true;
                        this.focusState = MenubarState.OPEN;
                    }
                    else {
                        eventHandled = false;
                    }
                    if (eventHandled) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }));
                this._register(Gesture.addTarget(buttonElement));
                this._register(DOM.addDisposableListener(buttonElement, EventType.Tap, (e) => {
                    // Ignore this touch if the menu is touched
                    if (this.isOpen &&
                        this.focusedMenu &&
                        this.focusedMenu.holder &&
                        DOM.isAncestor(e.initialTarget, this.focusedMenu.holder)) {
                        return;
                    }
                    this.ignoreNextMouseUp = false;
                    this.onMenuTriggered(menuIndex, true);
                    e.preventDefault();
                    e.stopPropagation();
                }));
                this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_DOWN, (e) => {
                    // Ignore non-left-click
                    const mouseEvent = new StandardMouseEvent(DOM.getWindow(buttonElement), e);
                    if (!mouseEvent.leftButton) {
                        e.preventDefault();
                        return;
                    }
                    if (!this.isOpen) {
                        // Open the menu with mouse down and ignore the following mouse up event
                        this.ignoreNextMouseUp = true;
                        this.onMenuTriggered(menuIndex, true);
                    }
                    else {
                        this.ignoreNextMouseUp = false;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }));
                this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_UP, (e) => {
                    if (e.defaultPrevented) {
                        return;
                    }
                    if (!this.ignoreNextMouseUp) {
                        if (this.isFocused) {
                            this.onMenuTriggered(menuIndex, true);
                        }
                    }
                    else {
                        this.ignoreNextMouseUp = false;
                    }
                }));
                this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_ENTER, () => {
                    if (this.isOpen && !this.isCurrentMenu(menuIndex)) {
                        buttonElement.focus();
                        this.cleanupCustomMenu();
                        this.showCustomMenu(menuIndex, false);
                    }
                    else if (this.isFocused && !this.isOpen) {
                        this.focusedMenu = { index: menuIndex };
                        buttonElement.focus();
                    }
                }));
                this.menus.push({
                    label: menuBarMenu.label,
                    actions: menuBarMenu.actions,
                    buttonElement: buttonElement,
                    titleElement: titleElement,
                });
            }
        });
    }
    createOverflowMenu() {
        const label = this.isCompact
            ? nls.localize('mAppMenu', 'Application Menu')
            : nls.localize('mMore', 'More');
        const buttonElement = $('div.menubar-menu-button', {
            role: 'menuitem',
            tabindex: this.isCompact ? 0 : -1,
            'aria-label': label,
            'aria-haspopup': true,
        });
        const titleElement = $('div.menubar-menu-title.toolbar-toggle-more' + ThemeIcon.asCSSSelector(Codicon.menuBarMore), { role: 'none', 'aria-hidden': true });
        buttonElement.appendChild(titleElement);
        this.container.appendChild(buttonElement);
        buttonElement.style.visibility = 'hidden';
        this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = true;
            const triggerKeys = [3 /* KeyCode.Enter */];
            if (!this.isCompact) {
                triggerKeys.push(18 /* KeyCode.DownArrow */);
            }
            else {
                triggerKeys.push(10 /* KeyCode.Space */);
                if (this.options.compactMode?.horizontal === HorizontalDirection.Right) {
                    triggerKeys.push(17 /* KeyCode.RightArrow */);
                }
                else if (this.options.compactMode?.horizontal === HorizontalDirection.Left) {
                    triggerKeys.push(15 /* KeyCode.LeftArrow */);
                }
            }
            if (triggerKeys.some((k) => event.equals(k)) && !this.isOpen) {
                this.focusedMenu = { index: MenuBar.OVERFLOW_INDEX };
                this.openedViaKeyboard = true;
                this.focusState = MenubarState.OPEN;
            }
            else {
                eventHandled = false;
            }
            if (eventHandled) {
                event.preventDefault();
                event.stopPropagation();
            }
        }));
        this._register(Gesture.addTarget(buttonElement));
        this._register(DOM.addDisposableListener(buttonElement, EventType.Tap, (e) => {
            // Ignore this touch if the menu is touched
            if (this.isOpen &&
                this.focusedMenu &&
                this.focusedMenu.holder &&
                DOM.isAncestor(e.initialTarget, this.focusedMenu.holder)) {
                return;
            }
            this.ignoreNextMouseUp = false;
            this.onMenuTriggered(MenuBar.OVERFLOW_INDEX, true);
            e.preventDefault();
            e.stopPropagation();
        }));
        this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_DOWN, (e) => {
            // Ignore non-left-click
            const mouseEvent = new StandardMouseEvent(DOM.getWindow(buttonElement), e);
            if (!mouseEvent.leftButton) {
                e.preventDefault();
                return;
            }
            if (!this.isOpen) {
                // Open the menu with mouse down and ignore the following mouse up event
                this.ignoreNextMouseUp = true;
                this.onMenuTriggered(MenuBar.OVERFLOW_INDEX, true);
            }
            else {
                this.ignoreNextMouseUp = false;
            }
            e.preventDefault();
            e.stopPropagation();
        }));
        this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_UP, (e) => {
            if (e.defaultPrevented) {
                return;
            }
            if (!this.ignoreNextMouseUp) {
                if (this.isFocused) {
                    this.onMenuTriggered(MenuBar.OVERFLOW_INDEX, true);
                }
            }
            else {
                this.ignoreNextMouseUp = false;
            }
        }));
        this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_ENTER, () => {
            if (this.isOpen && !this.isCurrentMenu(MenuBar.OVERFLOW_INDEX)) {
                this.overflowMenu.buttonElement.focus();
                this.cleanupCustomMenu();
                this.showCustomMenu(MenuBar.OVERFLOW_INDEX, false);
            }
            else if (this.isFocused && !this.isOpen) {
                this.focusedMenu = { index: MenuBar.OVERFLOW_INDEX };
                buttonElement.focus();
            }
        }));
        this.overflowMenu = {
            buttonElement: buttonElement,
            titleElement: titleElement,
            label: 'More',
            actions: [],
        };
    }
    updateMenu(menu) {
        const menuToUpdate = this.menus.filter((menuBarMenu) => menuBarMenu.label === menu.label);
        if (menuToUpdate && menuToUpdate.length) {
            menuToUpdate[0].actions = menu.actions;
        }
    }
    dispose() {
        super.dispose();
        this.menus.forEach((menuBarMenu) => {
            menuBarMenu.titleElement?.remove();
            menuBarMenu.buttonElement?.remove();
        });
        this.overflowMenu.titleElement.remove();
        this.overflowMenu.buttonElement.remove();
        dispose(this.overflowLayoutScheduled);
        this.overflowLayoutScheduled = undefined;
    }
    blur() {
        this.setUnfocusedState();
    }
    getWidth() {
        if (!this.isCompact && this.menus) {
            const left = this.menus[0].buttonElement.getBoundingClientRect().left;
            const right = this.hasOverflow
                ? this.overflowMenu.buttonElement.getBoundingClientRect().right
                : this.menus[this.menus.length - 1].buttonElement.getBoundingClientRect().right;
            return right - left;
        }
        return 0;
    }
    getHeight() {
        return this.container.clientHeight;
    }
    toggleFocus() {
        if (!this.isFocused && this.options.visibility !== 'hidden') {
            this.mnemonicsInUse = true;
            this.focusedMenu = { index: this.numMenusShown > 0 ? 0 : MenuBar.OVERFLOW_INDEX };
            this.focusState = MenubarState.FOCUSED;
        }
        else if (!this.isOpen) {
            this.setUnfocusedState();
        }
    }
    updateOverflowAction() {
        if (!this.menus || !this.menus.length) {
            return;
        }
        const overflowMenuOnlyClass = 'overflow-menu-only';
        // Remove overflow only restriction to allow the most space
        this.container.classList.toggle(overflowMenuOnlyClass, false);
        const sizeAvailable = this.container.offsetWidth;
        let currentSize = 0;
        let full = this.isCompact;
        const prevNumMenusShown = this.numMenusShown;
        this.numMenusShown = 0;
        const showableMenus = this.menus.filter((menu) => menu.buttonElement !== undefined && menu.titleElement !== undefined);
        for (const menuBarMenu of showableMenus) {
            if (!full) {
                const size = menuBarMenu.buttonElement.offsetWidth;
                if (currentSize + size > sizeAvailable) {
                    full = true;
                }
                else {
                    currentSize += size;
                    this.numMenusShown++;
                    if (this.numMenusShown > prevNumMenusShown) {
                        menuBarMenu.buttonElement.style.visibility = 'visible';
                    }
                }
            }
            if (full) {
                menuBarMenu.buttonElement.style.visibility = 'hidden';
            }
        }
        // If below minimium menu threshold, show the overflow menu only as hamburger menu
        if (this.numMenusShown - 1 <= showableMenus.length / 4) {
            for (const menuBarMenu of showableMenus) {
                menuBarMenu.buttonElement.style.visibility = 'hidden';
            }
            full = true;
            this.numMenusShown = 0;
            currentSize = 0;
        }
        // Overflow
        if (this.isCompact) {
            this.overflowMenu.actions = [];
            for (let idx = this.numMenusShown; idx < this.menus.length; idx++) {
                this.overflowMenu.actions.push(new SubmenuAction(`menubar.submenu.${this.menus[idx].label}`, this.menus[idx].label, this.menus[idx].actions || []));
            }
            const compactMenuActions = this.options.getCompactMenuActions?.();
            if (compactMenuActions && compactMenuActions.length) {
                this.overflowMenu.actions.push(new Separator());
                this.overflowMenu.actions.push(...compactMenuActions);
            }
            this.overflowMenu.buttonElement.style.visibility = 'visible';
        }
        else if (full) {
            // Can't fit the more button, need to remove more menus
            while (currentSize + this.overflowMenu.buttonElement.offsetWidth > sizeAvailable &&
                this.numMenusShown > 0) {
                this.numMenusShown--;
                const size = showableMenus[this.numMenusShown].buttonElement.offsetWidth;
                showableMenus[this.numMenusShown].buttonElement.style.visibility = 'hidden';
                currentSize -= size;
            }
            this.overflowMenu.actions = [];
            for (let idx = this.numMenusShown; idx < showableMenus.length; idx++) {
                this.overflowMenu.actions.push(new SubmenuAction(`menubar.submenu.${showableMenus[idx].label}`, showableMenus[idx].label, showableMenus[idx].actions || []));
            }
            if (this.overflowMenu.buttonElement.nextElementSibling !==
                showableMenus[this.numMenusShown].buttonElement) {
                this.overflowMenu.buttonElement.remove();
                this.container.insertBefore(this.overflowMenu.buttonElement, showableMenus[this.numMenusShown].buttonElement);
            }
            this.overflowMenu.buttonElement.style.visibility = 'visible';
        }
        else {
            this.overflowMenu.buttonElement.remove();
            this.container.appendChild(this.overflowMenu.buttonElement);
            this.overflowMenu.buttonElement.style.visibility = 'hidden';
        }
        // If we are only showing the overflow, add this class to avoid taking up space
        this.container.classList.toggle(overflowMenuOnlyClass, this.numMenusShown === 0);
    }
    updateLabels(titleElement, buttonElement, label) {
        const cleanMenuLabel = cleanMnemonic(label);
        // Update the button label to reflect mnemonics
        if (this.options.enableMnemonics) {
            const cleanLabel = strings.escape(label);
            // This is global so reset it
            MENU_ESCAPED_MNEMONIC_REGEX.lastIndex = 0;
            let escMatch = MENU_ESCAPED_MNEMONIC_REGEX.exec(cleanLabel);
            // We can't use negative lookbehind so we match our negative and skip
            while (escMatch && escMatch[1]) {
                escMatch = MENU_ESCAPED_MNEMONIC_REGEX.exec(cleanLabel);
            }
            const replaceDoubleEscapes = (str) => str.replace(/&amp;&amp;/g, '&amp;');
            if (escMatch) {
                titleElement.innerText = '';
                titleElement.append(strings.ltrim(replaceDoubleEscapes(cleanLabel.substr(0, escMatch.index)), ' '), $('mnemonic', { 'aria-hidden': 'true' }, escMatch[3]), strings.rtrim(replaceDoubleEscapes(cleanLabel.substr(escMatch.index + escMatch[0].length)), ' '));
            }
            else {
                titleElement.innerText = replaceDoubleEscapes(cleanLabel).trim();
            }
        }
        else {
            titleElement.innerText = cleanMenuLabel.replace(/&&/g, '&');
        }
        const mnemonicMatches = MENU_MNEMONIC_REGEX.exec(label);
        // Register mnemonics
        if (mnemonicMatches) {
            const mnemonic = !!mnemonicMatches[1] ? mnemonicMatches[1] : mnemonicMatches[3];
            if (this.options.enableMnemonics) {
                buttonElement.setAttribute('aria-keyshortcuts', 'Alt+' + mnemonic.toLocaleLowerCase());
            }
            else {
                buttonElement.removeAttribute('aria-keyshortcuts');
            }
        }
    }
    update(options) {
        if (options) {
            this.options = options;
        }
        // Don't update while using the menu
        if (this.isFocused) {
            this.updatePending = true;
            return;
        }
        this.menus.forEach((menuBarMenu) => {
            if (!menuBarMenu.buttonElement || !menuBarMenu.titleElement) {
                return;
            }
            this.updateLabels(menuBarMenu.titleElement, menuBarMenu.buttonElement, menuBarMenu.label);
        });
        if (!this.overflowLayoutScheduled) {
            this.overflowLayoutScheduled = DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.container), () => {
                this.updateOverflowAction();
                this.overflowLayoutScheduled = undefined;
            });
        }
        this.setUnfocusedState();
    }
    registerMnemonic(menuIndex, mnemonic) {
        this.mnemonics.set(mnemonic.toLocaleLowerCase(), menuIndex);
    }
    hideMenubar() {
        if (this.container.style.display !== 'none') {
            this.container.style.display = 'none';
            this._onVisibilityChange.fire(false);
        }
    }
    showMenubar() {
        if (this.container.style.display !== 'flex') {
            this.container.style.display = 'flex';
            this._onVisibilityChange.fire(true);
            this.updateOverflowAction();
        }
    }
    get focusState() {
        return this._focusState;
    }
    set focusState(value) {
        if (this._focusState >= MenubarState.FOCUSED && value < MenubarState.FOCUSED) {
            // Losing focus, update the menu if needed
            if (this.updatePending) {
                this.menuUpdater.schedule();
                this.updatePending = false;
            }
        }
        if (value === this._focusState) {
            return;
        }
        const isVisible = this.isVisible;
        const isOpen = this.isOpen;
        const isFocused = this.isFocused;
        this._focusState = value;
        switch (value) {
            case MenubarState.HIDDEN:
                if (isVisible) {
                    this.hideMenubar();
                }
                if (isOpen) {
                    this.cleanupCustomMenu();
                }
                if (isFocused) {
                    this.focusedMenu = undefined;
                    if (this.focusToReturn) {
                        this.focusToReturn.focus();
                        this.focusToReturn = undefined;
                    }
                }
                break;
            case MenubarState.VISIBLE:
                if (!isVisible) {
                    this.showMenubar();
                }
                if (isOpen) {
                    this.cleanupCustomMenu();
                }
                if (isFocused) {
                    if (this.focusedMenu) {
                        if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
                            this.overflowMenu.buttonElement.blur();
                        }
                        else {
                            this.menus[this.focusedMenu.index].buttonElement?.blur();
                        }
                    }
                    this.focusedMenu = undefined;
                    if (this.focusToReturn) {
                        this.focusToReturn.focus();
                        this.focusToReturn = undefined;
                    }
                }
                break;
            case MenubarState.FOCUSED:
                if (!isVisible) {
                    this.showMenubar();
                }
                if (isOpen) {
                    this.cleanupCustomMenu();
                }
                if (this.focusedMenu) {
                    // When the menu is toggled on, it may be in compact state and trying to
                    // focus the first menu. In this case we should focus the overflow instead.
                    if (this.focusedMenu.index === 0 && this.numMenusShown === 0) {
                        this.focusedMenu.index = MenuBar.OVERFLOW_INDEX;
                    }
                    if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
                        this.overflowMenu.buttonElement.focus();
                    }
                    else {
                        this.menus[this.focusedMenu.index].buttonElement?.focus();
                    }
                }
                break;
            case MenubarState.OPEN:
                if (!isVisible) {
                    this.showMenubar();
                }
                if (this.focusedMenu) {
                    this.cleanupCustomMenu();
                    this.showCustomMenu(this.focusedMenu.index, this.openedViaKeyboard);
                }
                break;
        }
        this._focusState = value;
        this._onFocusStateChange.fire(this.focusState >= MenubarState.FOCUSED);
    }
    get isVisible() {
        return this.focusState >= MenubarState.VISIBLE;
    }
    get isFocused() {
        return this.focusState >= MenubarState.FOCUSED;
    }
    get isOpen() {
        return this.focusState >= MenubarState.OPEN;
    }
    get hasOverflow() {
        return this.isCompact || this.numMenusShown < this.menus.length;
    }
    get isCompact() {
        return this.options.compactMode !== undefined;
    }
    setUnfocusedState() {
        if (this.options.visibility === 'toggle' || this.options.visibility === 'hidden') {
            this.focusState = MenubarState.HIDDEN;
        }
        else if (this.options.visibility === 'classic' && browser.isFullscreen(mainWindow)) {
            this.focusState = MenubarState.HIDDEN;
        }
        else {
            this.focusState = MenubarState.VISIBLE;
        }
        this.ignoreNextMouseUp = false;
        this.mnemonicsInUse = false;
        this.updateMnemonicVisibility(false);
    }
    focusPrevious() {
        if (!this.focusedMenu || this.numMenusShown === 0) {
            return;
        }
        let newFocusedIndex = (this.focusedMenu.index - 1 + this.numMenusShown) % this.numMenusShown;
        if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
            newFocusedIndex = this.numMenusShown - 1;
        }
        else if (this.focusedMenu.index === 0 && this.hasOverflow) {
            newFocusedIndex = MenuBar.OVERFLOW_INDEX;
        }
        if (newFocusedIndex === this.focusedMenu.index) {
            return;
        }
        if (this.isOpen) {
            this.cleanupCustomMenu();
            this.showCustomMenu(newFocusedIndex);
        }
        else if (this.isFocused) {
            this.focusedMenu.index = newFocusedIndex;
            if (newFocusedIndex === MenuBar.OVERFLOW_INDEX) {
                this.overflowMenu.buttonElement.focus();
            }
            else {
                this.menus[newFocusedIndex].buttonElement?.focus();
            }
        }
    }
    focusNext() {
        if (!this.focusedMenu || this.numMenusShown === 0) {
            return;
        }
        let newFocusedIndex = (this.focusedMenu.index + 1) % this.numMenusShown;
        if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
            newFocusedIndex = 0;
        }
        else if (this.focusedMenu.index === this.numMenusShown - 1) {
            newFocusedIndex = MenuBar.OVERFLOW_INDEX;
        }
        if (newFocusedIndex === this.focusedMenu.index) {
            return;
        }
        if (this.isOpen) {
            this.cleanupCustomMenu();
            this.showCustomMenu(newFocusedIndex);
        }
        else if (this.isFocused) {
            this.focusedMenu.index = newFocusedIndex;
            if (newFocusedIndex === MenuBar.OVERFLOW_INDEX) {
                this.overflowMenu.buttonElement.focus();
            }
            else {
                this.menus[newFocusedIndex].buttonElement?.focus();
            }
        }
    }
    updateMnemonicVisibility(visible) {
        if (this.menus) {
            this.menus.forEach((menuBarMenu) => {
                if (menuBarMenu.titleElement && menuBarMenu.titleElement.children.length) {
                    const child = menuBarMenu.titleElement.children.item(0);
                    if (child) {
                        child.style.textDecoration =
                            this.options.alwaysOnMnemonics || visible ? 'underline' : '';
                    }
                }
            });
        }
    }
    get mnemonicsInUse() {
        return this._mnemonicsInUse;
    }
    set mnemonicsInUse(value) {
        this._mnemonicsInUse = value;
    }
    get shouldAltKeyFocus() {
        if (isMacintosh) {
            return false;
        }
        if (!this.options.disableAltFocus) {
            return true;
        }
        if (this.options.visibility === 'toggle') {
            return true;
        }
        return false;
    }
    get onVisibilityChange() {
        return this._onVisibilityChange.event;
    }
    get onFocusStateChange() {
        return this._onFocusStateChange.event;
    }
    onMenuTriggered(menuIndex, clicked) {
        if (this.isOpen) {
            if (this.isCurrentMenu(menuIndex)) {
                this.setUnfocusedState();
            }
            else {
                this.cleanupCustomMenu();
                this.showCustomMenu(menuIndex, this.openedViaKeyboard);
            }
        }
        else {
            this.focusedMenu = { index: menuIndex };
            this.openedViaKeyboard = !clicked;
            this.focusState = MenubarState.OPEN;
        }
    }
    onModifierKeyToggled(modifierKeyStatus) {
        const allModifiersReleased = !modifierKeyStatus.altKey &&
            !modifierKeyStatus.ctrlKey &&
            !modifierKeyStatus.shiftKey &&
            !modifierKeyStatus.metaKey;
        if (this.options.visibility === 'hidden') {
            return;
        }
        // Prevent alt-key default if the menu is not hidden and we use alt to focus
        if (modifierKeyStatus.event && this.shouldAltKeyFocus) {
            if (ScanCodeUtils.toEnum(modifierKeyStatus.event.code) === 159 /* ScanCode.AltLeft */) {
                modifierKeyStatus.event.preventDefault();
            }
        }
        // Alt key pressed while menu is focused. This should return focus away from the menubar
        if (this.isFocused && modifierKeyStatus.lastKeyPressed === 'alt' && modifierKeyStatus.altKey) {
            this.setUnfocusedState();
            this.mnemonicsInUse = false;
            this.awaitingAltRelease = true;
        }
        // Clean alt key press and release
        if (allModifiersReleased &&
            modifierKeyStatus.lastKeyPressed === 'alt' &&
            modifierKeyStatus.lastKeyReleased === 'alt') {
            if (!this.awaitingAltRelease) {
                if (!this.isFocused && this.shouldAltKeyFocus) {
                    this.mnemonicsInUse = true;
                    this.focusedMenu = { index: this.numMenusShown > 0 ? 0 : MenuBar.OVERFLOW_INDEX };
                    this.focusState = MenubarState.FOCUSED;
                }
                else if (!this.isOpen) {
                    this.setUnfocusedState();
                }
            }
        }
        // Alt key released
        if (!modifierKeyStatus.altKey && modifierKeyStatus.lastKeyReleased === 'alt') {
            this.awaitingAltRelease = false;
        }
        if (this.options.enableMnemonics && this.menus && !this.isOpen) {
            this.updateMnemonicVisibility((!this.awaitingAltRelease && modifierKeyStatus.altKey) || this.mnemonicsInUse);
        }
    }
    isCurrentMenu(menuIndex) {
        if (!this.focusedMenu) {
            return false;
        }
        return this.focusedMenu.index === menuIndex;
    }
    cleanupCustomMenu() {
        if (this.focusedMenu) {
            // Remove focus from the menus first
            if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
                this.overflowMenu.buttonElement.focus();
            }
            else {
                this.menus[this.focusedMenu.index].buttonElement?.focus();
            }
            if (this.focusedMenu.holder) {
                this.focusedMenu.holder.parentElement?.classList.remove('open');
                this.focusedMenu.holder.remove();
            }
            this.focusedMenu.widget?.dispose();
            this.focusedMenu = { index: this.focusedMenu.index };
        }
        this.menuDisposables.clear();
    }
    showCustomMenu(menuIndex, selectFirst = true) {
        const actualMenuIndex = menuIndex >= this.numMenusShown ? MenuBar.OVERFLOW_INDEX : menuIndex;
        const customMenu = actualMenuIndex === MenuBar.OVERFLOW_INDEX ? this.overflowMenu : this.menus[actualMenuIndex];
        if (!customMenu.actions || !customMenu.buttonElement || !customMenu.titleElement) {
            return;
        }
        const menuHolder = $('div.menubar-menu-items-holder', { title: '' });
        customMenu.buttonElement.classList.add('open');
        const titleBoundingRect = customMenu.titleElement.getBoundingClientRect();
        const titleBoundingRectZoom = DOM.getDomNodeZoomLevel(customMenu.titleElement);
        if (this.options.compactMode?.horizontal === HorizontalDirection.Right) {
            menuHolder.style.left = `${titleBoundingRect.left + this.container.clientWidth}px`;
        }
        else if (this.options.compactMode?.horizontal === HorizontalDirection.Left) {
            const windowWidth = DOM.getWindow(this.container).innerWidth;
            menuHolder.style.right = `${windowWidth - titleBoundingRect.left}px`;
            menuHolder.style.left = 'auto';
        }
        else {
            menuHolder.style.left = `${titleBoundingRect.left * titleBoundingRectZoom}px`;
        }
        if (this.options.compactMode?.vertical === VerticalDirection.Above) {
            // TODO@benibenj Do not hardcode the height of the menu holder
            menuHolder.style.top = `${titleBoundingRect.top - this.menus.length * 30 + this.container.clientHeight}px`;
        }
        else if (this.options.compactMode?.vertical === VerticalDirection.Below) {
            menuHolder.style.top = `${titleBoundingRect.top}px`;
        }
        else {
            menuHolder.style.top = `${titleBoundingRect.bottom * titleBoundingRectZoom}px`;
        }
        customMenu.buttonElement.appendChild(menuHolder);
        const menuOptions = {
            getKeyBinding: this.options.getKeybinding,
            actionRunner: this.actionRunner,
            enableMnemonics: this.options.alwaysOnMnemonics || (this.mnemonicsInUse && this.options.enableMnemonics),
            ariaLabel: customMenu.buttonElement.getAttribute('aria-label') ?? undefined,
            expandDirection: this.isCompact
                ? this.options.compactMode
                : { horizontal: HorizontalDirection.Right, vertical: VerticalDirection.Below },
            useEventAsContext: true,
        };
        const menuWidget = this.menuDisposables.add(new Menu(menuHolder, customMenu.actions, menuOptions, this.menuStyle));
        this.menuDisposables.add(menuWidget.onDidCancel(() => {
            this.focusState = MenubarState.FOCUSED;
        }));
        if (actualMenuIndex !== menuIndex) {
            menuWidget.trigger(menuIndex - this.numMenusShown);
        }
        else {
            menuWidget.focus(selectFirst);
        }
        this.focusedMenu = {
            index: actualMenuIndex,
            holder: menuHolder,
            widget: menuWidget,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL21lbnUvbWVudWJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGtCQUFrQixDQUFBO0FBQzNDLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFBO0FBQ25DLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFnQixNQUFNLGdCQUFnQixDQUFBO0FBQ2pFLE9BQU8sRUFDTixhQUFhLEVBQ2IsbUJBQW1CLEVBSW5CLElBQUksRUFDSiwyQkFBMkIsRUFDM0IsbUJBQW1CLEVBQ25CLGlCQUFpQixHQUNqQixNQUFNLFdBQVcsQ0FBQTtBQUNsQixPQUFPLEVBQ04sWUFBWSxFQUdaLFNBQVMsRUFDVCxhQUFhLEdBQ2IsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDbkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sMEJBQTBCLENBQUE7QUFDekQsT0FBTyxFQUE2QixhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUV0RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNoRyxP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