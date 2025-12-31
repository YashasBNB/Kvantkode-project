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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvZHJvcGRvd24vZHJvcGRvd24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsTUFBTSxFQUNOLFdBQVcsRUFDWCxTQUFTLEVBQ1QsWUFBWSxHQUNaLE1BQU0sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzlELE9BQU8sRUFBRSxTQUFTLElBQUksZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFHdkUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUUsT0FBTyxFQUFFLFlBQVksRUFBVyxNQUFNLDRCQUE0QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUdsRCxPQUFPLGdCQUFnQixDQUFBO0FBV3ZCLE1BQU0sWUFBYSxTQUFRLFlBQVk7SUFZdEMsWUFBWSxTQUFzQixFQUFFLE9BQTZCO1FBQ2hFLEtBQUssRUFBRSxDQUFBO1FBTkEsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDOUQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQTtRQU9qRSxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUV4RCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7UUFFekQsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQTtRQUN6QyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsYUFBYSxHQUFHLENBQUMsU0FBc0IsRUFBc0IsRUFBRTtnQkFDOUQsU0FBUyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQTtnQkFFM0MsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDLENBQUE7UUFDRixDQUFDO1FBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ25GLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDLDZDQUE2QztRQUMzSSxDQUFDO1FBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQy9DLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN6RCxpSEFBaUg7b0JBQ2pILDRHQUE0RztvQkFDNUcsT0FBTTtnQkFDUCxDQUFDO2dCQUVELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNsQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ1osQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDWixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzVELE1BQU0sS0FBSyxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUMsSUFBSSxLQUFLLENBQUMsTUFBTSx1QkFBZSxJQUFJLEtBQUssQ0FBQyxNQUFNLHdCQUFlLEVBQUUsQ0FBQztnQkFDaEUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUEsQ0FBQyxtREFBbUQ7Z0JBRTdFLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNsQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ1osQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDWixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzFCLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFlO1FBQzFCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMxQix5QkFBeUIsRUFBRSxDQUFDLGlCQUFpQixDQUM1Qyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFDaEMsSUFBSSxDQUFDLE1BQU0sRUFDWCxPQUFPLENBQ1AsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDM0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7WUFDbkIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN2QyxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUk7UUFDSCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtZQUNwQixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3hDLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUztRQUNSLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDdEIsQ0FBQztJQUVTLE9BQU8sQ0FBQyxFQUFTLEVBQUUsYUFBMEI7UUFDdEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ1osQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFWCxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQzFCLElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFBO1FBQzlCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFBO1FBQzFCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO1FBQ3hCLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFNRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsR0FBWTtJQUM1QyxNQUFNLFNBQVMsR0FBRyxHQUFrQyxDQUFBO0lBRXBELE9BQU8sT0FBTyxTQUFTLEVBQUUsVUFBVSxLQUFLLFVBQVUsQ0FBQTtBQUNuRCxDQUFDO0FBV0QsTUFBTSxPQUFPLFlBQWEsU0FBUSxZQUFZO0lBSTdDLFlBQ0MsU0FBc0IsRUFDTCxRQUE4QjtRQUUvQyxLQUFLLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRlQsYUFBUSxHQUFSLFFBQVEsQ0FBc0I7UUFKeEMsYUFBUSxHQUF1QixFQUFFLENBQUE7UUFReEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsSUFBSSxXQUFXLENBQUMsT0FBaUM7UUFDaEQsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUE7SUFDNUIsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBRUQsSUFBWSxPQUFPO1FBQ2xCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNsQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2pELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELElBQVksT0FBTyxDQUFDLE9BQTJCO1FBQzlDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO0lBQ3hCLENBQUM7SUFFUSxJQUFJO1FBQ1osS0FBSyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRVosSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXBDLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDO1lBQ2pELFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTztZQUM3QixVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU87WUFDOUIsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzdFLGlCQUFpQixFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQ3RDLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0I7Z0JBQzFELENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUM7Z0JBQzFELENBQUMsQ0FBQyxTQUFTO1lBQ2IsYUFBYSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDekIsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWE7Z0JBQ2pELENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7Z0JBQ3hDLENBQUMsQ0FBQyxTQUFTO1lBQ2IsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLElBQUksRUFBRTtZQUN6RCxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUMzQixZQUFZLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDMUUsZUFBZSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUMsNkJBQXFCO1lBQzNGLGdCQUFnQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ3RFLGFBQWEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWE7U0FDMUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLElBQUk7UUFDWixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDYixDQUFDO0lBRU8sTUFBTTtRQUNiLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNYLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0NBQ0QifQ==