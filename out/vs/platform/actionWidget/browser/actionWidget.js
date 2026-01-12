var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../base/common/lifecycle.js';
import './actionWidget.css';
import { localize, localize2 } from '../../../nls.js';
import { acceptSelectedActionCommand, ActionList, previewSelectedActionCommand, } from './actionList.js';
import { Action2, registerAction2 } from '../../actions/common/actions.js';
import { IContextKeyService, RawContextKey } from '../../contextkey/common/contextkey.js';
import { IContextViewService } from '../../contextview/browser/contextView.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { createDecorator, IInstantiationService, } from '../../instantiation/common/instantiation.js';
import { inputActiveOptionBackground, registerColor } from '../../theme/common/colorRegistry.js';
registerColor('actionBar.toggledBackground', inputActiveOptionBackground, localize('actionBar.toggledBackground', 'Background color for toggled action items in action bar.'));
const ActionWidgetContextKeys = {
    Visible: new RawContextKey('codeActionMenuVisible', false, localize('codeActionMenuVisible', 'Whether the action widget list is visible')),
};
export const IActionWidgetService = createDecorator('actionWidgetService');
let ActionWidgetService = class ActionWidgetService extends Disposable {
    get isVisible() {
        return ActionWidgetContextKeys.Visible.getValue(this._contextKeyService) || false;
    }
    constructor(_contextViewService, _contextKeyService, _instantiationService) {
        super();
        this._contextViewService = _contextViewService;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._list = this._register(new MutableDisposable());
    }
    show(user, supportsPreview, items, delegate, anchor, container, actionBarActions) {
        const visibleContext = ActionWidgetContextKeys.Visible.bindTo(this._contextKeyService);
        const list = this._instantiationService.createInstance(ActionList, user, supportsPreview, items, delegate);
        this._contextViewService.showContextView({
            getAnchor: () => anchor,
            render: (container) => {
                visibleContext.set(true);
                return this._renderWidget(container, list, actionBarActions ?? []);
            },
            onHide: (didCancel) => {
                visibleContext.reset();
                this._onWidgetClosed(didCancel);
            },
        }, container, false);
    }
    acceptSelected(preview) {
        this._list.value?.acceptSelected(preview);
    }
    focusPrevious() {
        this._list?.value?.focusPrevious();
    }
    focusNext() {
        this._list?.value?.focusNext();
    }
    hide(didCancel) {
        this._list.value?.hide(didCancel);
        this._list.clear();
    }
    clear() {
        this._list.clear();
    }
    _renderWidget(element, list, actionBarActions) {
        const widget = document.createElement('div');
        widget.classList.add('action-widget');
        element.appendChild(widget);
        this._list.value = list;
        if (this._list.value) {
            widget.appendChild(this._list.value.domNode);
        }
        else {
            throw new Error('List has no value');
        }
        const renderDisposables = new DisposableStore();
        // Invisible div to block mouse interaction in the rest of the UI
        const menuBlock = document.createElement('div');
        const block = element.appendChild(menuBlock);
        block.classList.add('context-view-block');
        renderDisposables.add(dom.addDisposableListener(block, dom.EventType.MOUSE_DOWN, (e) => e.stopPropagation()));
        // Invisible div to block mouse interaction with the menu
        const pointerBlockDiv = document.createElement('div');
        const pointerBlock = element.appendChild(pointerBlockDiv);
        pointerBlock.classList.add('context-view-pointerBlock');
        // Removes block on click INSIDE widget or ANY mouse movement
        renderDisposables.add(dom.addDisposableListener(pointerBlock, dom.EventType.POINTER_MOVE, () => pointerBlock.remove()));
        renderDisposables.add(dom.addDisposableListener(pointerBlock, dom.EventType.MOUSE_DOWN, () => pointerBlock.remove()));
        // Action bar
        let actionBarWidth = 0;
        if (actionBarActions.length) {
            const actionBar = this._createActionBar('.action-widget-action-bar', actionBarActions);
            if (actionBar) {
                widget.appendChild(actionBar.getContainer().parentElement);
                renderDisposables.add(actionBar);
                actionBarWidth = actionBar.getContainer().offsetWidth;
            }
        }
        const width = this._list.value?.layout(actionBarWidth);
        widget.style.width = `${width}px`;
        const focusTracker = renderDisposables.add(dom.trackFocus(element));
        renderDisposables.add(focusTracker.onDidBlur(() => this.hide(true)));
        return renderDisposables;
    }
    _createActionBar(className, actions) {
        if (!actions.length) {
            return undefined;
        }
        const container = dom.$(className);
        const actionBar = new ActionBar(container);
        actionBar.push(actions, { icon: false, label: true });
        return actionBar;
    }
    _onWidgetClosed(didCancel) {
        this._list.value?.hide(didCancel);
    }
};
ActionWidgetService = __decorate([
    __param(0, IContextViewService),
    __param(1, IContextKeyService),
    __param(2, IInstantiationService)
], ActionWidgetService);
registerSingleton(IActionWidgetService, ActionWidgetService, 1 /* InstantiationType.Delayed */);
const weight = 100 /* KeybindingWeight.EditorContrib */ + 1000;
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'hideCodeActionWidget',
            title: localize2('hideCodeActionWidget.title', 'Hide action widget'),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 9 /* KeyCode.Escape */,
                secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
            },
        });
    }
    run(accessor) {
        accessor.get(IActionWidgetService).hide(true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'selectPrevCodeAction',
            title: localize2('selectPrevCodeAction.title', 'Select previous action'),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 16 /* KeyCode.UpArrow */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
                mac: {
                    primary: 16 /* KeyCode.UpArrow */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */, 256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */],
                },
            },
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.focusPrevious();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'selectNextCodeAction',
            title: localize2('selectNextCodeAction.title', 'Select next action'),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 18 /* KeyCode.DownArrow */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
                mac: {
                    primary: 18 /* KeyCode.DownArrow */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, 256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */],
                },
            },
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.focusNext();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: acceptSelectedActionCommand,
            title: localize2('acceptSelected.title', 'Accept selected action'),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 3 /* KeyCode.Enter */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */],
            },
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.acceptSelected();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: previewSelectedActionCommand,
            title: localize2('previewSelected.title', 'Preview selected action'),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
            },
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.acceptSelected(true);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25XaWRnZXQvYnJvd3Nlci9hY3Rpb25XaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFJM0UsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsaUJBQWlCLEdBQ2pCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3JELE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IsVUFBVSxFQUdWLDRCQUE0QixHQUM1QixNQUFNLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzlFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRixPQUFPLEVBQ04sZUFBZSxFQUNmLHFCQUFxQixHQUVyQixNQUFNLDZDQUE2QyxDQUFBO0FBRXBELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVoRyxhQUFhLENBQ1osNkJBQTZCLEVBQzdCLDJCQUEyQixFQUMzQixRQUFRLENBQ1AsNkJBQTZCLEVBQzdCLDBEQUEwRCxDQUMxRCxDQUNELENB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