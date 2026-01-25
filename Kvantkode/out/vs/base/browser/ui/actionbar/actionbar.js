/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { ActionViewItem, BaseActionViewItem } from './actionViewItems.js';
import { createInstantHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { ActionRunner, Separator, } from '../../../common/actions.js';
import { Emitter } from '../../../common/event.js';
import { Disposable, DisposableMap, DisposableStore, dispose, } from '../../../common/lifecycle.js';
import * as types from '../../../common/types.js';
import './actionbar.css';
export var ActionsOrientation;
(function (ActionsOrientation) {
    ActionsOrientation[ActionsOrientation["HORIZONTAL"] = 0] = "HORIZONTAL";
    ActionsOrientation[ActionsOrientation["VERTICAL"] = 1] = "VERTICAL";
})(ActionsOrientation || (ActionsOrientation = {}));
export class ActionBar extends Disposable {
    constructor(container, options = {}) {
        super();
        this._actionRunnerDisposables = this._register(new DisposableStore());
        this.viewItemDisposables = this._register(new DisposableMap());
        // Trigger Key Tracking
        this.triggerKeyDown = false;
        this.focusable = true;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidCancel = this._register(new Emitter({ onWillAddFirstListener: () => (this.cancelHasListener = true) }));
        this.onDidCancel = this._onDidCancel.event;
        this.cancelHasListener = false;
        this._onDidRun = this._register(new Emitter());
        this.onDidRun = this._onDidRun.event;
        this._onWillRun = this._register(new Emitter());
        this.onWillRun = this._onWillRun.event;
        this.options = options;
        this._context = options.context ?? null;
        this._orientation = this.options.orientation ?? 0 /* ActionsOrientation.HORIZONTAL */;
        this._triggerKeys = {
            keyDown: this.options.triggerKeys?.keyDown ?? false,
            keys: this.options.triggerKeys?.keys ?? [3 /* KeyCode.Enter */, 10 /* KeyCode.Space */],
        };
        this._hoverDelegate = options.hoverDelegate ?? this._register(createInstantHoverDelegate());
        if (this.options.actionRunner) {
            this._actionRunner = this.options.actionRunner;
        }
        else {
            this._actionRunner = new ActionRunner();
            this._actionRunnerDisposables.add(this._actionRunner);
        }
        this._actionRunnerDisposables.add(this._actionRunner.onDidRun((e) => this._onDidRun.fire(e)));
        this._actionRunnerDisposables.add(this._actionRunner.onWillRun((e) => this._onWillRun.fire(e)));
        this.viewItems = [];
        this.focusedItem = undefined;
        this.domNode = document.createElement('div');
        this.domNode.className = 'monaco-action-bar';
        let previousKeys;
        let nextKeys;
        switch (this._orientation) {
            case 0 /* ActionsOrientation.HORIZONTAL */:
                previousKeys = [15 /* KeyCode.LeftArrow */];
                nextKeys = [17 /* KeyCode.RightArrow */];
                break;
            case 1 /* ActionsOrientation.VERTICAL */:
                previousKeys = [16 /* KeyCode.UpArrow */];
                nextKeys = [18 /* KeyCode.DownArrow */];
                this.domNode.className += ' vertical';
                break;
        }
        this._register(DOM.addDisposableListener(this.domNode, DOM.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = true;
            const focusedItem = typeof this.focusedItem === 'number' ? this.viewItems[this.focusedItem] : undefined;
            if (previousKeys && (event.equals(previousKeys[0]) || event.equals(previousKeys[1]))) {
                eventHandled = this.focusPrevious();
            }
            else if (nextKeys && (event.equals(nextKeys[0]) || event.equals(nextKeys[1]))) {
                eventHandled = this.focusNext();
            }
            else if (event.equals(9 /* KeyCode.Escape */) && this.cancelHasListener) {
                this._onDidCancel.fire();
            }
            else if (event.equals(14 /* KeyCode.Home */)) {
                eventHandled = this.focusFirst();
            }
            else if (event.equals(13 /* KeyCode.End */)) {
                eventHandled = this.focusLast();
            }
            else if (event.equals(2 /* KeyCode.Tab */) &&
                focusedItem instanceof BaseActionViewItem &&
                focusedItem.trapsArrowNavigation) {
                // Tab, so forcibly focus next #219199
                eventHandled = this.focusNext(undefined, true);
            }
            else if (this.isTriggerKeyEvent(event)) {
                // Staying out of the else branch even if not triggered
                if (this._triggerKeys.keyDown) {
                    this.doTrigger(event);
                }
                else {
                    this.triggerKeyDown = true;
                }
            }
            else {
                eventHandled = false;
            }
            if (eventHandled) {
                event.preventDefault();
                event.stopPropagation();
            }
        }));
        this._register(DOM.addDisposableListener(this.domNode, DOM.EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            // Run action on Enter/Space
            if (this.isTriggerKeyEvent(event)) {
                if (!this._triggerKeys.keyDown && this.triggerKeyDown) {
                    this.triggerKeyDown = false;
                    this.doTrigger(event);
                }
                event.preventDefault();
                event.stopPropagation();
            }
            // Recompute focused item
            else if (event.equals(2 /* KeyCode.Tab */) ||
                event.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */) ||
                event.equals(16 /* KeyCode.UpArrow */) ||
                event.equals(18 /* KeyCode.DownArrow */) ||
                event.equals(15 /* KeyCode.LeftArrow */) ||
                event.equals(17 /* KeyCode.RightArrow */)) {
                this.updateFocusedItem();
            }
        }));
        this.focusTracker = this._register(DOM.trackFocus(this.domNode));
        this._register(this.focusTracker.onDidBlur(() => {
            if (DOM.getActiveElement() === this.domNode ||
                !DOM.isAncestor(DOM.getActiveElement(), this.domNode)) {
                this._onDidBlur.fire();
                this.previouslyFocusedItem = this.focusedItem;
                this.focusedItem = undefined;
                this.triggerKeyDown = false;
            }
        }));
        this._register(this.focusTracker.onDidFocus(() => this.updateFocusedItem()));
        this.actionsList = document.createElement('ul');
        this.actionsList.className = 'actions-container';
        if (this.options.highlightToggledItems) {
            this.actionsList.classList.add('highlight-toggled');
        }
        this.actionsList.setAttribute('role', this.options.ariaRole || 'toolbar');
        if (this.options.ariaLabel) {
            this.actionsList.setAttribute('aria-label', this.options.ariaLabel);
        }
        this.domNode.appendChild(this.actionsList);
        container.appendChild(this.domNode);
    }
    refreshRole() {
        if (this.length() >= 1) {
            this.actionsList.setAttribute('role', this.options.ariaRole || 'toolbar');
        }
        else {
            this.actionsList.setAttribute('role', 'presentation');
        }
    }
    setAriaLabel(label) {
        if (label) {
            this.actionsList.setAttribute('aria-label', label);
        }
        else {
            this.actionsList.removeAttribute('aria-label');
        }
    }
    // Some action bars should not be focusable at times
    // When an action bar is not focusable make sure to make all the elements inside it not focusable
    // When an action bar is focusable again, make sure the first item can be focused
    setFocusable(focusable) {
        this.focusable = focusable;
        if (this.focusable) {
            const firstEnabled = this.viewItems.find((vi) => vi instanceof BaseActionViewItem && vi.isEnabled());
            if (firstEnabled instanceof BaseActionViewItem) {
                firstEnabled.setFocusable(true);
            }
        }
        else {
            this.viewItems.forEach((vi) => {
                if (vi instanceof BaseActionViewItem) {
                    vi.setFocusable(false);
                }
            });
        }
    }
    isTriggerKeyEvent(event) {
        let ret = false;
        this._triggerKeys.keys.forEach((keyCode) => {
            ret = ret || event.equals(keyCode);
        });
        return ret;
    }
    updateFocusedItem() {
        for (let i = 0; i < this.actionsList.children.length; i++) {
            const elem = this.actionsList.children[i];
            if (DOM.isAncestor(DOM.getActiveElement(), elem)) {
                this.focusedItem = i;
                this.viewItems[this.focusedItem]?.showHover?.();
                break;
            }
        }
    }
    get context() {
        return this._context;
    }
    set context(context) {
        this._context = context;
        this.viewItems.forEach((i) => i.setActionContext(context));
    }
    get actionRunner() {
        return this._actionRunner;
    }
    set actionRunner(actionRunner) {
        this._actionRunner = actionRunner;
        // when setting a new `IActionRunner` make sure to dispose old listeners and
        // start to forward events from the new listener
        this._actionRunnerDisposables.clear();
        this._actionRunnerDisposables.add(this._actionRunner.onDidRun((e) => this._onDidRun.fire(e)));
        this._actionRunnerDisposables.add(this._actionRunner.onWillRun((e) => this._onWillRun.fire(e)));
        this.viewItems.forEach((item) => (item.actionRunner = actionRunner));
    }
    getContainer() {
        return this.domNode;
    }
    hasAction(action) {
        return this.viewItems.findIndex((candidate) => candidate.action.id === action.id) !== -1;
    }
    getAction(indexOrElement) {
        // by index
        if (typeof indexOrElement === 'number') {
            return this.viewItems[indexOrElement]?.action;
        }
        // by element
        if (DOM.isHTMLElement(indexOrElement)) {
            while (indexOrElement.parentElement !== this.actionsList) {
                if (!indexOrElement.parentElement) {
                    return undefined;
                }
                indexOrElement = indexOrElement.parentElement;
            }
            for (let i = 0; i < this.actionsList.childNodes.length; i++) {
                if (this.actionsList.childNodes[i] === indexOrElement) {
                    return this.viewItems[i].action;
                }
            }
        }
        return undefined;
    }
    push(arg, options = {}) {
        const actions = Array.isArray(arg) ? arg : [arg];
        let index = types.isNumber(options.index) ? options.index : null;
        actions.forEach((action) => {
            const actionViewItemElement = document.createElement('li');
            actionViewItemElement.className = 'action-item';
            actionViewItemElement.setAttribute('role', 'presentation');
            let item;
            const viewItemOptions = {
                hoverDelegate: this._hoverDelegate,
                ...options,
                isTabList: this.options.ariaRole === 'tablist',
            };
            if (this.options.actionViewItemProvider) {
                item = this.options.actionViewItemProvider(action, viewItemOptions);
            }
            if (!item) {
                item = new ActionViewItem(this.context, action, viewItemOptions);
            }
            // Prevent native context menu on actions
            if (!this.options.allowContextMenu) {
                this.viewItemDisposables.set(item, DOM.addDisposableListener(actionViewItemElement, DOM.EventType.CONTEXT_MENU, (e) => {
                    DOM.EventHelper.stop(e, true);
                }));
            }
            item.actionRunner = this._actionRunner;
            item.setActionContext(this.context);
            item.render(actionViewItemElement);
            if (this.focusable && item instanceof BaseActionViewItem && this.viewItems.length === 0) {
                // We need to allow for the first enabled item to be focused on using tab navigation #106441
                item.setFocusable(true);
            }
            if (index === null || index < 0 || index >= this.actionsList.children.length) {
                this.actionsList.appendChild(actionViewItemElement);
                this.viewItems.push(item);
            }
            else {
                this.actionsList.insertBefore(actionViewItemElement, this.actionsList.children[index]);
                this.viewItems.splice(index, 0, item);
                index++;
            }
        });
        if (typeof this.focusedItem === 'number') {
            // After a clear actions might be re-added to simply toggle some actions. We should preserve focus #97128
            this.focus(this.focusedItem);
        }
        this.refreshRole();
    }
    getWidth(index) {
        if (index >= 0 && index < this.actionsList.children.length) {
            const item = this.actionsList.children.item(index);
            if (item) {
                return item.clientWidth;
            }
        }
        return 0;
    }
    getHeight(index) {
        if (index >= 0 && index < this.actionsList.children.length) {
            const item = this.actionsList.children.item(index);
            if (item) {
                return item.clientHeight;
            }
        }
        return 0;
    }
    pull(index) {
        if (index >= 0 && index < this.viewItems.length) {
            this.actionsList.childNodes[index].remove();
            this.viewItemDisposables.deleteAndDispose(this.viewItems[index]);
            dispose(this.viewItems.splice(index, 1));
            this.refreshRole();
        }
    }
    clear() {
        if (this.isEmpty()) {
            return;
        }
        this.viewItems = dispose(this.viewItems);
        this.viewItemDisposables.clearAndDisposeAll();
        DOM.clearNode(this.actionsList);
        this.refreshRole();
    }
    length() {
        return this.viewItems.length;
    }
    isEmpty() {
        return this.viewItems.length === 0;
    }
    focus(arg) {
        let selectFirst = false;
        let index = undefined;
        if (arg === undefined) {
            selectFirst = true;
        }
        else if (typeof arg === 'number') {
            index = arg;
        }
        else if (typeof arg === 'boolean') {
            selectFirst = arg;
        }
        if (selectFirst && typeof this.focusedItem === 'undefined') {
            const firstEnabled = this.viewItems.findIndex((item) => item.isEnabled());
            // Focus the first enabled item
            this.focusedItem = firstEnabled === -1 ? undefined : firstEnabled;
            this.updateFocus(undefined, undefined, true);
        }
        else {
            if (index !== undefined) {
                this.focusedItem = index;
            }
            this.updateFocus(undefined, undefined, true);
        }
    }
    focusFirst() {
        this.focusedItem = this.length() - 1;
        return this.focusNext(true);
    }
    focusLast() {
        this.focusedItem = 0;
        return this.focusPrevious(true);
    }
    focusNext(forceLoop, forceFocus) {
        if (typeof this.focusedItem === 'undefined') {
            this.focusedItem = this.viewItems.length - 1;
        }
        else if (this.viewItems.length <= 1) {
            return false;
        }
        const startIndex = this.focusedItem;
        let item;
        do {
            if (!forceLoop &&
                this.options.preventLoopNavigation &&
                this.focusedItem + 1 >= this.viewItems.length) {
                this.focusedItem = startIndex;
                return false;
            }
            this.focusedItem = (this.focusedItem + 1) % this.viewItems.length;
            item = this.viewItems[this.focusedItem];
        } while (this.focusedItem !== startIndex &&
            ((this.options.focusOnlyEnabledItems && !item.isEnabled()) || item.action.id === Separator.ID));
        this.updateFocus(undefined, undefined, forceFocus);
        return true;
    }
    focusPrevious(forceLoop) {
        if (typeof this.focusedItem === 'undefined') {
            this.focusedItem = 0;
        }
        else if (this.viewItems.length <= 1) {
            return false;
        }
        const startIndex = this.focusedItem;
        let item;
        do {
            this.focusedItem = this.focusedItem - 1;
            if (this.focusedItem < 0) {
                if (!forceLoop && this.options.preventLoopNavigation) {
                    this.focusedItem = startIndex;
                    return false;
                }
                this.focusedItem = this.viewItems.length - 1;
            }
            item = this.viewItems[this.focusedItem];
        } while (this.focusedItem !== startIndex &&
            ((this.options.focusOnlyEnabledItems && !item.isEnabled()) || item.action.id === Separator.ID));
        this.updateFocus(true);
        return true;
    }
    updateFocus(fromRight, preventScroll, forceFocus = false) {
        if (typeof this.focusedItem === 'undefined') {
            this.actionsList.focus({ preventScroll });
        }
        if (this.previouslyFocusedItem !== undefined &&
            this.previouslyFocusedItem !== this.focusedItem) {
            this.viewItems[this.previouslyFocusedItem]?.blur();
        }
        const actionViewItem = this.focusedItem !== undefined ? this.viewItems[this.focusedItem] : undefined;
        if (actionViewItem) {
            let focusItem = true;
            if (!types.isFunction(actionViewItem.focus)) {
                focusItem = false;
            }
            if (this.options.focusOnlyEnabledItems &&
                types.isFunction(actionViewItem.isEnabled) &&
                !actionViewItem.isEnabled()) {
                focusItem = false;
            }
            if (actionViewItem.action.id === Separator.ID) {
                focusItem = false;
            }
            if (!focusItem) {
                this.actionsList.focus({ preventScroll });
                this.previouslyFocusedItem = undefined;
            }
            else if (forceFocus || this.previouslyFocusedItem !== this.focusedItem) {
                actionViewItem.focus(fromRight);
                this.previouslyFocusedItem = this.focusedItem;
            }
            if (focusItem) {
                actionViewItem.showHover?.();
            }
        }
    }
    doTrigger(event) {
        if (typeof this.focusedItem === 'undefined') {
            return; //nothing to focus
        }
        // trigger action
        const actionViewItem = this.viewItems[this.focusedItem];
        if (actionViewItem instanceof BaseActionViewItem) {
            const context = actionViewItem._context === null || actionViewItem._context === undefined
                ? event
                : actionViewItem._context;
            this.run(actionViewItem._action, context);
        }
    }
    async run(action, context) {
        await this._actionRunner.run(action, context);
    }
    dispose() {
        this._context = undefined;
        this.viewItems = dispose(this.viewItems);
        this.getContainer().remove();
        super.dispose();
    }
}
export function prepareActions(actions) {
    if (!actions.length) {
        return actions;
    }
    // Clean up leading separators
    let firstIndexOfAction = -1;
    for (let i = 0; i < actions.length; i++) {
        if (actions[i].id === Separator.ID) {
            continue;
        }
        firstIndexOfAction = i;
        break;
    }
    if (firstIndexOfAction === -1) {
        return [];
    }
    actions = actions.slice(firstIndexOfAction);
    // Clean up trailing separators
    for (let h = actions.length - 1; h >= 0; h--) {
        const isSeparator = actions[h].id === Separator.ID;
        if (isSeparator) {
            actions.splice(h, 1);
        }
        else {
            break;
        }
    }
    // Clean up separator duplicates
    let foundAction = false;
    for (let k = actions.length - 1; k >= 0; k--) {
        const isSeparator = actions[k].id === Separator.ID;
        if (isSeparator && !foundAction) {
            actions.splice(k, 1);
        }
        else if (!isSeparator) {
            foundAction = true;
        }
        else if (isSeparator) {
            foundAction = false;
        }
    }
    return actions;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvYWN0aW9uYmFyL2FjdGlvbmJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUNuQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUEwQixNQUFNLHNCQUFzQixDQUFBO0FBQ2pHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTdFLE9BQU8sRUFDTixZQUFZLEVBSVosU0FBUyxHQUNULE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRWxELE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsRUFDZixPQUFPLEdBRVAsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEtBQUssS0FBSyxNQUFNLDBCQUEwQixDQUFBO0FBQ2pELE9BQU8saUJBQWlCLENBQUE7QUFpQnhCLE1BQU0sQ0FBTixJQUFrQixrQkFHakI7QUFIRCxXQUFrQixrQkFBa0I7SUFDbkMsdUVBQVUsQ0FBQTtJQUNWLG1FQUFRLENBQUE7QUFDVCxDQUFDLEVBSGlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFHbkM7QUErQkQsTUFBTSxPQUFPLFNBQVUsU0FBUSxVQUFVO0lBNEN4QyxZQUFZLFNBQXNCLEVBQUUsVUFBNkIsRUFBRTtRQUNsRSxLQUFLLEVBQUUsQ0FBQTtRQXhDUyw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQVVoRSx3QkFBbUIsR0FBRyxJQUFJ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