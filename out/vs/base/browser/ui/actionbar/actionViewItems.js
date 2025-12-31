/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFirefox } from '../../browser.js';
import { DataTransfers } from '../../dnd.js';
import { addDisposableListener, EventHelper, EventType } from '../../dom.js';
import { EventType as TouchEventType, Gesture } from '../../touch.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { SelectBox, } from '../selectBox/selectBox.js';
import { Action, ActionRunner, Separator, } from '../../../common/actions.js';
import { Disposable } from '../../../common/lifecycle.js';
import * as platform from '../../../common/platform.js';
import * as types from '../../../common/types.js';
import './actionbar.css';
import * as nls from '../../../../nls.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
export class BaseActionViewItem extends Disposable {
    get action() {
        return this._action;
    }
    constructor(context, action, options = {}) {
        super();
        this.options = options;
        this._context = context || this;
        this._action = action;
        if (action instanceof Action) {
            this._register(action.onDidChange((event) => {
                if (!this.element) {
                    // we have not been rendered yet, so there
                    // is no point in updating the UI
                    return;
                }
                this.handleActionChangeEvent(event);
            }));
        }
    }
    handleActionChangeEvent(event) {
        if (event.enabled !== undefined) {
            this.updateEnabled();
        }
        if (event.checked !== undefined) {
            this.updateChecked();
        }
        if (event.class !== undefined) {
            this.updateClass();
        }
        if (event.label !== undefined) {
            this.updateLabel();
            this.updateTooltip();
        }
        if (event.tooltip !== undefined) {
            this.updateTooltip();
        }
    }
    get actionRunner() {
        if (!this._actionRunner) {
            this._actionRunner = this._register(new ActionRunner());
        }
        return this._actionRunner;
    }
    set actionRunner(actionRunner) {
        this._actionRunner = actionRunner;
    }
    isEnabled() {
        return this._action.enabled;
    }
    setActionContext(newContext) {
        this._context = newContext;
    }
    render(container) {
        const element = (this.element = container);
        this._register(Gesture.addTarget(container));
        const enableDragging = this.options && this.options.draggable;
        if (enableDragging) {
            container.draggable = true;
            if (isFirefox) {
                // Firefox: requires to set a text data transfer to get going
                this._register(addDisposableListener(container, EventType.DRAG_START, (e) => e.dataTransfer?.setData(DataTransfers.TEXT, this._action.label)));
            }
        }
        this._register(addDisposableListener(element, TouchEventType.Tap, (e) => this.onClick(e, true))); // Preserve focus on tap #125470
        this._register(addDisposableListener(element, EventType.MOUSE_DOWN, (e) => {
            if (!enableDragging) {
                EventHelper.stop(e, true); // do not run when dragging is on because that would disable it
            }
            if (this._action.enabled && e.button === 0) {
                element.classList.add('active');
            }
        }));
        if (platform.isMacintosh) {
            // macOS: allow to trigger the button when holding Ctrl+key and pressing the
            // main mouse button. This is for scenarios where e.g. some interaction forces
            // the Ctrl+key to be pressed and hold but the user still wants to interact
            // with the actions (for example quick access in quick navigation mode).
            this._register(addDisposableListener(element, EventType.CONTEXT_MENU, (e) => {
                if (e.button === 0 && e.ctrlKey === true) {
                    this.onClick(e);
                }
            }));
        }
        this._register(addDisposableListener(element, EventType.CLICK, (e) => {
            EventHelper.stop(e, true);
            // menus do not use the click event
            if (!(this.options && this.options.isMenu)) {
                this.onClick(e);
            }
        }));
        this._register(addDisposableListener(element, EventType.DBLCLICK, (e) => {
            EventHelper.stop(e, true);
        }));
        [EventType.MOUSE_UP, EventType.MOUSE_OUT].forEach((event) => {
            this._register(addDisposableListener(element, event, (e) => {
                EventHelper.stop(e);
                element.classList.remove('active');
            }));
        });
    }
    onClick(event, preserveFocus = false) {
        EventHelper.stop(event, true);
        const context = types.isUndefinedOrNull(this._context)
            ? this.options?.useEventAsContext
                ? event
                : { preserveFocus }
            : this._context;
        this.actionRunner.run(this._action, context);
    }
    // Only set the tabIndex on the element once it is about to get focused
    // That way this element wont be a tab stop when it is not needed #106441
    focus() {
        if (this.element) {
            this.element.tabIndex = 0;
            this.element.focus();
            this.element.classList.add('focused');
        }
    }
    isFocused() {
        return !!this.element?.classList.contains('focused');
    }
    blur() {
        if (this.element) {
            this.element.blur();
            this.element.tabIndex = -1;
            this.element.classList.remove('focused');
        }
    }
    setFocusable(focusable) {
        if (this.element) {
            this.element.tabIndex = focusable ? 0 : -1;
        }
    }
    get trapsArrowNavigation() {
        return false;
    }
    updateEnabled() {
        // implement in subclass
    }
    updateLabel() {
        // implement in subclass
    }
    getClass() {
        return this.action.class;
    }
    getTooltip() {
        return this.action.tooltip;
    }
    updateTooltip() {
        if (!this.element) {
            return;
        }
        const title = this.getTooltip() ?? '';
        this.updateAriaLabel();
        if (this.options.hoverDelegate?.showNativeHover) {
            /* While custom hover is not inside custom hover */
            this.element.title = title;
        }
        else {
            if (!this.customHover && title !== '') {
                const hoverDelegate = this.options.hoverDelegate ?? getDefaultHoverDelegate('element');
                this.customHover = this._store.add(getBaseLayerHoverDelegate().setupManagedHover(hoverDelegate, this.element, title));
            }
            else if (this.customHover) {
                this.customHover.update(title);
            }
        }
    }
    updateAriaLabel() {
        if (this.element) {
            const title = this.getTooltip() ?? '';
            this.element.setAttribute('aria-label', title);
        }
    }
    updateClass() {
        // implement in subclass
    }
    updateChecked() {
        // implement in subclass
    }
    dispose() {
        if (this.element) {
            this.element.remove();
            this.element = undefined;
        }
        this._context = undefined;
        super.dispose();
    }
}
export class ActionViewItem extends BaseActionViewItem {
    constructor(context, action, options) {
        super(context, action, options);
        this.options = options;
        this.options.icon = options.icon !== undefined ? options.icon : false;
        this.options.label = options.label !== undefined ? options.label : true;
        this.cssClass = '';
    }
    render(container) {
        super.render(container);
        types.assertType(this.element);
        const label = document.createElement('a');
        label.classList.add('action-label');
        label.setAttribute('role', this.getDefaultAriaRole());
        this.label = label;
        this.element.appendChild(label);
        if (this.options.label &&
            this.options.keybinding &&
            !this.options.keybindingNotRenderedWithLabel) {
            const kbLabel = document.createElement('span');
            kbLabel.classList.add('keybinding');
            kbLabel.textContent = this.options.keybinding;
            this.element.appendChild(kbLabel);
        }
        this.updateClass();
        this.updateLabel();
        this.updateTooltip();
        this.updateEnabled();
        this.updateChecked();
    }
    getDefaultAriaRole() {
        if (this._action.id === Separator.ID) {
            return 'presentation'; // A separator is a presentation item
        }
        else {
            if (this.options.isMenu) {
                return 'menuitem';
            }
            else if (this.options.isTabList) {
                return 'tab';
            }
            else {
                return 'button';
            }
        }
    }
    // Only set the tabIndex on the element once it is about to get focused
    // That way this element wont be a tab stop when it is not needed #106441
    focus() {
        if (this.label) {
            this.label.tabIndex = 0;
            this.label.focus();
        }
    }
    isFocused() {
        return !!this.label && this.label?.tabIndex === 0;
    }
    blur() {
        if (this.label) {
            this.label.tabIndex = -1;
        }
    }
    setFocusable(focusable) {
        if (this.label) {
            this.label.tabIndex = focusable ? 0 : -1;
        }
    }
    updateLabel() {
        if (this.options.label && this.label) {
            this.label.textContent = this.action.label;
        }
    }
    getTooltip() {
        let title = null;
        if (this.action.tooltip) {
            title = this.action.tooltip;
        }
        else if (this.action.label) {
            title = this.action.label;
            if (this.options.keybinding) {
                title = nls.localize({ key: 'titleLabel', comment: ['action title', 'action keybinding'] }, '{0} ({1})', title, this.options.keybinding);
            }
        }
        return title ?? undefined;
    }
    updateClass() {
        if (this.cssClass && this.label) {
            this.label.classList.remove(...this.cssClass.split(' '));
        }
        if (this.options.icon) {
            this.cssClass = this.getClass();
            if (this.label) {
                this.label.classList.add('codicon');
                if (this.cssClass) {
                    this.label.classList.add(...this.cssClass.split(' '));
                }
            }
            this.updateEnabled();
        }
        else {
            this.label?.classList.remove('codicon');
        }
    }
    updateEnabled() {
        if (this.action.enabled) {
            if (this.label) {
                this.label.removeAttribute('aria-disabled');
                this.label.classList.remove('disabled');
            }
            this.element?.classList.remove('disabled');
        }
        else {
            if (this.label) {
                this.label.setAttribute('aria-disabled', 'true');
                this.label.classList.add('disabled');
            }
            this.element?.classList.add('disabled');
        }
    }
    updateAriaLabel() {
        if (this.label) {
            const title = this.getTooltip() ?? '';
            this.label.setAttribute('aria-label', title);
        }
    }
    updateChecked() {
        if (this.label) {
            if (this.action.checked !== undefined) {
                this.label.classList.toggle('checked', this.action.checked);
                if (this.options.isTabList) {
                    this.label.setAttribute('aria-selected', this.action.checked ? 'true' : 'false');
                }
                else {
                    this.label.setAttribute('aria-checked', this.action.checked ? 'true' : 'false');
                    this.label.setAttribute('role', 'checkbox');
                }
            }
            else {
                this.label.classList.remove('checked');
                this.label.removeAttribute(this.options.isTabList ? 'aria-selected' : 'aria-checked');
                this.label.setAttribute('role', this.getDefaultAriaRole());
            }
        }
    }
}
export class SelectActionViewItem extends BaseActionViewItem {
    constructor(ctx, action, options, selected, contextViewProvider, styles, selectBoxOptions) {
        super(ctx, action);
        this.selectBox = new SelectBox(options, selected, contextViewProvider, styles, selectBoxOptions);
        this.selectBox.setFocusable(false);
        this._register(this.selectBox);
        this.registerListeners();
    }
    setOptions(options, selected) {
        this.selectBox.setOptions(options, selected);
    }
    select(index) {
        this.selectBox.select(index);
    }
    registerListeners() {
        this._register(this.selectBox.onDidSelect((e) => this.runAction(e.selected, e.index)));
    }
    runAction(option, index) {
        this.actionRunner.run(this._action, this.getActionContext(option, index));
    }
    getActionContext(option, index) {
        return option;
    }
    setFocusable(focusable) {
        this.selectBox.setFocusable(focusable);
    }
    focus() {
        this.selectBox?.focus();
    }
    blur() {
        this.selectBox?.blur();
    }
    render(container) {
        this.selectBox.render(container);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uVmlld0l0ZW1zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2FjdGlvbmJhci9hY3Rpb25WaWV3SXRlbXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzVDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDNUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBYSxTQUFTLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdkYsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFHckUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUUsT0FBTyxFQUlOLFNBQVMsR0FDVCxNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFDTixNQUFNLEVBQ04sWUFBWSxFQUlaLFNBQVMsR0FDVCxNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN6RCxPQUFPLEtBQUssUUFBUSxNQUFNLDZCQUE2QixDQUFBO0FBQ3ZELE9BQU8sS0FBSyxLQUFLLE1BQU0sMEJBQTBCLENBQUE7QUFDakQsT0FBTyxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBVXRFLE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFVO0lBUWpELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBSUQsWUFDQyxPQUFnQixFQUNoQixNQUFlLEVBQ0wsVUFBc0MsRUFBRTtRQUVsRCxLQUFLLEVBQUUsQ0FBQTtRQUZHLFlBQU8sR0FBUCxPQUFPLENBQWlDO1FBSWxELElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQTtRQUMvQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUVyQixJQUFJLE1BQU0sWUFBWSxNQUFNLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbkIsMENBQTBDO29CQUMxQyxpQ0FBaUM7b0JBQ2pDLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDcEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sdUJBQXVCLENBQUMsS0FBeUI7UUFDeEQsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNyQixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNyQixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNuQixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUNsQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDckIsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLENBQUE7UUFDeEQsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRUQsSUFBSSxZQUFZLENBQUMsWUFBMkI7UUFDM0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUE7SUFDbEMsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFBO0lBQzVCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxVQUFtQjtRQUNuQyxJQUFJLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQTtJQUMzQixDQUFDO0lBRUQsTUFBTSxDQUFDLFNBQXNCO1FBQzVCLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsQ0FBQTtRQUMxQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUU1QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFBO1FBQzdELElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsU0FBUyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7WUFFMUIsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZiw2REFBNkQ7Z0JBQzdELElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUM1RCxDQUFDLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQy9ELENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsZ0NBQWdDO1FBRWpJLElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3JCLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBLENBQUMsK0RBQStEO1lBQzFGLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzVDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2hDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDMUIsNEVBQTRFO1lBQzVFLDhFQUE4RTtZQUM5RSwyRUFBMkU7WUFDM0Usd0VBQXdFO1lBQ3hFLElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDNUQsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUMxQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDckQsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFekIsbUNBQW1DO1lBQ25DLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hELFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFCLENBQUMsQ0FBQyxDQUNGLENBRUE7UUFBQSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQzVELElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMzQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNuQixPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNuQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTyxDQUFDLEtBQWdCLEVBQUUsYUFBYSxHQUFHLEtBQUs7UUFDOUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFN0IsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDckQsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsaUJBQWlCO2dCQUNoQyxDQUFDLENBQUMsS0FBSztnQkFDUCxDQUFDLENBQUMsRUFBRSxhQUFhLEVBQUU7WUFDcEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUE7UUFDaEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsdUVBQXVFO0lBQ3ZFLHlFQUF5RTtJQUN6RSxLQUFLO1FBQ0osSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFBO1lBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDcEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUztRQUNSLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWSxDQUFDLFNBQWtCO1FBQzlCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMzQyxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksb0JBQW9CO1FBQ3ZCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVTLGFBQWE7UUFDdEIsd0JBQXdCO0lBQ3pCLENBQUM7SUFFUyxXQUFXO1FBQ3BCLHdCQUF3QjtJQUN6QixDQUFDO0lBRVMsUUFBUTtRQUNqQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFBO0lBQ3pCLENBQUM7SUFFUyxVQUFVO1FBQ25CLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUE7SUFDM0IsQ0FBQztJQUVTLGFBQWE7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFDckMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBRXRCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsZUFBZSxFQUFFLENBQUM7WUFDakQsbURBQW1EO1lBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUMzQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLEtBQUssS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksdUJBQXVCLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ3RGLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2pDLHlCQUF5QixFQUFFLENBQUMsaUJBQWlCLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQ2pGLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFUyxlQUFlO1FBQ3hCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUE7WUFDckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9DLENBQUM7SUFDRixDQUFDO0lBRVMsV0FBVztRQUNwQix3QkFBd0I7SUFDekIsQ0FBQztJQUVTLGFBQWE7UUFDdEIsd0JBQXdCO0lBQ3pCLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQTtRQUN6QixDQUFDO1FBQ0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUE7UUFDekIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7Q0FDRDtBQVVELE1BQU0sT0FBTyxjQUFlLFNBQVEsa0JBQWtCO0lBTXJELFlBQVksT0FBZ0IsRUFBRSxNQUFlLEVBQUUsT0FBK0I7UUFDN0UsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFL0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7UUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUNyRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ3ZFLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFFUSxNQUFNLENBQUMsU0FBc0I7UUFDckMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN2QixLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUU5QixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ25DLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUE7UUFFckQsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFL0IsSUFDQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUs7WUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVO1lBQ3ZCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsRUFDM0MsQ0FBQztZQUNGLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDOUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDbkMsT0FBTyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQTtZQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNsQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2xCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNsQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sY0FBYyxDQUFBLENBQUMscUNBQXFDO1FBQzVELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN6QixPQUFPLFVBQVUsQ0FBQTtZQUNsQixDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbkMsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxRQUFRLENBQUE7WUFDaEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsdUVBQXVFO0lBQ3ZFLHlFQUF5RTtJQUNoRSxLQUFLO1FBQ2IsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFFUSxTQUFTO1FBQ2pCLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxRQUFRLEtBQUssQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFUSxJQUFJO1FBQ1osSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFUSxZQUFZLENBQUMsU0FBa0I7UUFDdkMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7SUFDRixDQUFDO0lBRWtCLFdBQVc7UUFDN0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7SUFFa0IsVUFBVTtRQUM1QixJQUFJLEtBQUssR0FBa0IsSUFBSSxDQUFBO1FBRS9CLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN6QixLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUE7UUFDNUIsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM5QixLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUE7WUFDekIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUM3QixLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDbkIsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLEVBQ3JFLFdBQVcsRUFDWCxLQUFLLEVBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQ3ZCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxJQUFJLFNBQVMsQ0FBQTtJQUMxQixDQUFDO0lBRWtCLFdBQVc7UUFDN0IsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3pELENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7WUFFL0IsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDbkMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ25CLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ3RELENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3JCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7SUFDRixDQUFDO0lBRWtCLGFBQWE7UUFDL0IsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3pCLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFDM0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3hDLENBQUM7WUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDM0MsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUNoRCxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDckMsQ0FBQztZQUVELElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN4QyxDQUFDO0lBQ0YsQ0FBQztJQUVrQixlQUFlO1FBQ2pDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUE7WUFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdDLENBQUM7SUFDRixDQUFDO0lBRWtCLGFBQWE7UUFDL0IsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUMzRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQzVCLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDakYsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDL0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO2dCQUM1QyxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBQ3JGLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFBO1lBQzNELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG9CQUFpQyxTQUFRLGtCQUFrQjtJQUd2RSxZQUNDLEdBQVksRUFDWixNQUFlLEVBQ2YsT0FBNEIsRUFDNUIsUUFBZ0IsRUFDaEIsbUJBQXlDLEVBQ3pDLE1BQXdCLEVBQ3hCLGdCQUFvQztRQUVwQyxLQUFLLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRWxCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUNoRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVsQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM5QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQTRCLEVBQUUsUUFBaUI7UUFDekQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBYTtRQUNuQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFUyxTQUFTLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDaEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDMUUsQ0FBQztJQUVTLGdCQUFnQixDQUFDLE1BQWMsRUFBRSxLQUFhO1FBQ3ZELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVRLFlBQVksQ0FBQyxTQUFrQjtRQUN2QyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRVEsS0FBSztRQUNiLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFDeEIsQ0FBQztJQUVRLElBQUk7UUFDWixJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFUSxNQUFNLENBQUMsU0FBc0I7UUFDckMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDakMsQ0FBQztDQUNEIn0=