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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9tZW51L21lbnViYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxrQkFBa0IsQ0FBQTtBQUMzQyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUNuQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBZ0IsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sYUFBYSxFQUNiLG1CQUFtQixFQUluQixJQUFJLEVBQ0osMkJBQTJCLEVBQzNCLG1CQUFtQixFQUNuQixpQkFBaUIsR0FDakIsTUFBTSxXQUFXLENBQUE7QUFDbEIsT0FBTyxFQUNOLFlBQVksRUFHWixTQUFTLEVBQ1QsYUFBYSxHQUNiLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDBCQUEwQixDQUFBO0FBQ3pELE9BQU8sRUFBNkIsYUFBYSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sOEJBQThCLENBQUE7QUFDaEcsT0FBTyxF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