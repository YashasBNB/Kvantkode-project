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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9uV2lkZ2V0L2Jyb3dzZXIvYWN0aW9uV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBSTNFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNyRCxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLFVBQVUsRUFHViw0QkFBNEIsR0FDNUIsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM5RSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0YsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FFckIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsYUFBYSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFaEcsYUFBYSxDQUNaLDZCQUE2QixFQUM3QiwyQkFBMkIsRUFDM0IsUUFBUSxDQUNQLDZCQUE2QixFQUM3QiwwREFBMEQsQ0FDMUQsQ0FDRCxDQUFBO0FB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