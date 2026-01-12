/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, addDisposableListener, append, EventHelper, EventType, isMouseEvent, } from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { EventType as GestureEventType, Gesture } from '../../touch.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { ActionRunner } from '../../../common/actions.js';
import { Emitter } from '../../../common/event.js';
import './dropdown.css';
class BaseDropdown extends ActionRunner {
    constructor(container, options) {
        super();
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._element = append(container, $('.monaco-dropdown'));
        this._label = append(this._element, $('.dropdown-label'));
        let labelRenderer = options.labelRenderer;
        if (!labelRenderer) {
            labelRenderer = (container) => {
                container.textContent = options.label || '';
                return null;
            };
        }
        for (const event of [EventType.CLICK, EventType.MOUSE_DOWN, GestureEventType.Tap]) {
            this._register(addDisposableListener(this.element, event, (e) => EventHelper.stop(e, true))); // prevent default click behaviour to trigger
        }
        for (const event of [EventType.MOUSE_DOWN, GestureEventType.Tap]) {
            this._register(addDisposableListener(this._label, event, (e) => {
                if (isMouseEvent(e) && (e.detail > 1 || e.button !== 0)) {
                    // prevent right click trigger to allow separate context menu (https://github.com/microsoft/vscode/issues/151064)
                    // prevent multiple clicks to open multiple context menus (https://github.com/microsoft/vscode/issues/41363)
                    return;
                }
                if (this.visible) {
                    this.hide();
                }
                else {
                    this.show();
                }
            }));
        }
        this._register(addDisposableListener(this._label, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                EventHelper.stop(e, true); // https://github.com/microsoft/vscode/issues/57997
                if (this.visible) {
                    this.hide();
                }
                else {
                    this.show();
                }
            }
        }));
        const cleanupFn = labelRenderer(this._label);
        if (cleanupFn) {
            this._register(cleanupFn);
        }
        this._register(Gesture.addTarget(this._label));
    }
    get element() {
        return this._element;
    }
    get label() {
        return this._label;
    }
    set tooltip(tooltip) {
        if (this._label) {
            if (!this.hover && tooltip !== '') {
                this.hover = this._register(getBaseLayerHoverDelegate().setupManagedHover(getDefaultHoverDelegate('mouse'), this._label, tooltip));
            }
            else if (this.hover) {
                this.hover.update(tooltip);
            }
        }
    }
    show() {
        if (!this.visible) {
            this.visible = true;
            this._onDidChangeVisibility.fire(true);
        }
    }
    hide() {
        if (this.visible) {
            this.visible = false;
            this._onDidChangeVisibility.fire(false);
        }
    }
    isVisible() {
        return !!this.visible;
    }
    onEvent(_e, activeElement) {
        this.hide();
    }
    dispose() {
        super.dispose();
        this.hide();
        if (this.boxContainer) {
            this.boxContainer.remove();
            this.boxContainer = undefined;
        }
        if (this.contents) {
            this.contents.remove();
            this.contents = undefined;
        }
        if (this._label) {
            this._label.remove();
            this._label = undefined;
        }
    }
}
export function isActionProvider(obj) {
    const candidate = obj;
    return typeof candidate?.getActions === 'function';
}
export class DropdownMenu extends BaseDropdown {
    constructor(container, _options) {
        super(container, _options);
        this._options = _options;
        this._actions = [];
        this.actions = _options.actions || [];
    }
    set menuOptions(options) {
        this._menuOptions = options;
    }
    get menuOptions() {
        return this._menuOptions;
    }
    get actions() {
        if (this._options.actionProvider) {
            return this._options.actionProvider.getActions();
        }
        return this._actions;
    }
    set actions(actions) {
        this._actions = actions;
    }
    show() {
        super.show();
        this.element.classList.add('active');
        this._options.contextMenuProvider.showContextMenu({
            getAnchor: () => this.element,
            getActions: () => this.actions,
            getActionsContext: () => (this.menuOptions ? this.menuOptions.context : null),
            getActionViewItem: (action, options) => this.menuOptions && this.menuOptions.actionViewItemProvider
                ? this.menuOptions.actionViewItemProvider(action, options)
                : undefined,
            getKeyBinding: (action) => this.menuOptions && this.menuOptions.getKeyBinding
                ? this.menuOptions.getKeyBinding(action)
                : undefined,
            getMenuClassName: () => this._options.menuClassName || '',
            onHide: () => this.onHide(),
            actionRunner: this.menuOptions ? this.menuOptions.actionRunner : undefined,
            anchorAlignment: this.menuOptions ? this.menuOptions.anchorAlignment : 0 /* AnchorAlignment.LEFT */,
            domForShadowRoot: this._options.menuAsChild ? this.element : undefined,
            skipTelemetry: this._options.skipTelemetry,
        });
    }
    hide() {
        super.hide();
    }
    onHide() {
        this.hide();
        this.element.classList.remove('active');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9kcm9wZG93bi9kcm9wZG93bi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQ04sQ0FBQyxFQUNELHFCQUFxQixFQUNyQixNQUFNLEVBQ04sV0FBVyxFQUNYLFNBQVMsRUFDVCxZQUFZLEdBQ1osTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsSUFBSSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUd2RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsWUFBWSxFQUFXLE1BQU0sNEJBQTRCLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBR2xELE9BQU8sZ0JBQWdCLENBQUE7QUFXdkIsTUFBTSxZQUFhLFNBQVEsWUFBWTtJQVl0QyxZQUFZLFNBQXNCLEVBQUUsT0FBNkI7UUFDaEUsS0FBSyxFQUFFLENBQUE7UUFOQSwyQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFXLENBQUMsQ0FBQTtRQUM5RCwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBT2pFLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBRXhELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUks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