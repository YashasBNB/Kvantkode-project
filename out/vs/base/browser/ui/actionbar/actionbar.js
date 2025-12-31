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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2FjdGlvbmJhci9hY3Rpb25iYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBMEIsTUFBTSxzQkFBc0IsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU3RSxPQUFPLEVBQ04sWUFBWSxFQUlaLFNBQVMsR0FDVCxNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVsRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYixlQUFlLEVBQ2YsT0FBTyxHQUVQLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxLQUFLLEtBQUssTUFBTSwwQkFBMEIsQ0FBQTtBQUNqRCxPQUFPLGlCQUFpQixDQUFBO0FBaUJ4QixNQUFNLENBQU4sSUFBa0Isa0JBR2pCO0FBSEQsV0FBa0Isa0JBQWtCO0lBQ25DLHVFQUFVLENBQUE7SUFDVixtRUFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUhpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBR25DO0FBK0JELE1BQU0sT0FBTyxTQUFVLFNBQVEsVUFBVTtJQTRDeEMsWUFBWSxTQUFzQixFQUFFLFVBQTZCLEVBQUU7UUFDbEUsS0FBSyxFQUFFLENBQUE7UUF4Q1MsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFVaEUsd0JBQW1CLEdBQUcsSUFBSSxDQUFD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