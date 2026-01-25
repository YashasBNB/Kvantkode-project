/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ContextMenuController_1;
import * as dom from '../../../../base/browser/dom.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../base/common/platform.js';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { IMenuService, SubmenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService, isStandaloneEditorWorkspace, } from '../../../../platform/workspace/common/workspace.js';
let ContextMenuController = class ContextMenuController {
    static { ContextMenuController_1 = this; }
    static { this.ID = 'editor.contrib.contextmenu'; }
    static get(editor) {
        return editor.getContribution(ContextMenuController_1.ID);
    }
    constructor(editor, _contextMenuService, _contextViewService, _contextKeyService, _keybindingService, _menuService, _configurationService, _workspaceContextService) {
        this._contextMenuService = _contextMenuService;
        this._contextViewService = _contextViewService;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._menuService = _menuService;
        this._configurationService = _configurationService;
        this._workspaceContextService = _workspaceContextService;
        this._toDispose = new DisposableStore();
        this._contextMenuIsBeingShownCount = 0;
        this._editor = editor;
        this._toDispose.add(this._editor.onContextMenu((e) => this._onContextMenu(e)));
        this._toDispose.add(this._editor.onMouseWheel((e) => {
            if (this._contextMenuIsBeingShownCount > 0) {
                const view = this._contextViewService.getContextViewElement();
                const target = e.srcElement;
                // Event triggers on shadow root host first
                // Check if the context view is under this host before hiding it #103169
                if (!(target.shadowRoot && dom.getShadowRoot(view) === target.shadowRoot)) {
                    this._contextViewService.hideContextView();
                }
            }
        }));
        this._toDispose.add(this._editor.onKeyDown((e) => {
            if (!this._editor.getOption(24 /* EditorOption.contextmenu */)) {
                return; // Context menu is turned off through configuration
            }
            if (e.keyCode === 58 /* KeyCode.ContextMenu */) {
                // Chrome is funny like that
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu();
            }
        }));
    }
    _onContextMenu(e) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (!this._editor.getOption(24 /* EditorOption.contextmenu */)) {
            this._editor.focus();
            // Ensure the cursor is at the position of the mouse click
            if (e.target.position && !this._editor.getSelection().containsPosition(e.target.position)) {
                this._editor.setPosition(e.target.position);
            }
            return; // Context menu is turned off through configuration
        }
        if (e.target.type === 12 /* MouseTargetType.OVERLAY_WIDGET */) {
            return; // allow native menu on widgets to support right click on input field for example in find
        }
        if (e.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ && e.target.detail.injectedText) {
            return; // allow native menu on injected text
        }
        e.event.preventDefault();
        e.event.stopPropagation();
        if (e.target.type === 11 /* MouseTargetType.SCROLLBAR */) {
            return this._showScrollbarContextMenu(e.event);
        }
        if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */ &&
            e.target.type !== 7 /* MouseTargetType.CONTENT_EMPTY */ &&
            e.target.type !== 1 /* MouseTargetType.TEXTAREA */) {
            return; // only support mouse click into text or native context menu key for now
        }
        // Ensure the editor gets focus if it hasn't, so the right events are being sent to other contributions
        this._editor.focus();
        // Ensure the cursor is at the position of the mouse click
        if (e.target.position) {
            let hasSelectionAtPosition = false;
            for (const selection of this._editor.getSelections()) {
                if (selection.containsPosition(e.target.position)) {
                    hasSelectionAtPosition = true;
                    break;
                }
            }
            if (!hasSelectionAtPosition) {
                this._editor.setPosition(e.target.position);
            }
        }
        // Unless the user triggerd the context menu through Shift+F10, use the mouse position as menu position
        let anchor = null;
        if (e.target.type !== 1 /* MouseTargetType.TEXTAREA */) {
            anchor = e.event;
        }
        // Show the context menu
        this.showContextMenu(anchor);
    }
    showContextMenu(anchor) {
        if (!this._editor.getOption(24 /* EditorOption.contextmenu */)) {
            return; // Context menu is turned off through configuration
        }
        if (!this._editor.hasModel()) {
            return;
        }
        // Find actions available for menu
        const menuActions = this._getMenuActions(this._editor.getModel(), this._editor.contextMenuId);
        // Show menu if we have actions to show
        if (menuActions.length > 0) {
            this._doShowContextMenu(menuActions, anchor);
        }
    }
    _getMenuActions(model, menuId) {
        const result = [];
        // get menu groups
        const groups = this._menuService.getMenuActions(menuId, this._contextKeyService, {
            arg: model.uri,
        });
        // translate them into other actions
        for (const group of groups) {
            const [, actions] = group;
            let addedItems = 0;
            for (const action of actions) {
                if (action instanceof SubmenuItemAction) {
                    const subActions = this._getMenuActions(model, action.item.submenu);
                    if (subActions.length > 0) {
                        result.push(new SubmenuAction(action.id, action.label, subActions));
                        addedItems++;
                    }
                }
                else {
                    result.push(action);
                    addedItems++;
                }
            }
            if (addedItems) {
                result.push(new Separator());
            }
        }
        if (result.length) {
            result.pop(); // remove last separator
        }
        return result;
    }
    _doShowContextMenu(actions, event = null) {
        if (!this._editor.hasModel()) {
            return;
        }
        // Disable hover
        const oldHoverSetting = this._editor.getOption(62 /* EditorOption.hover */);
        this._editor.updateOptions({
            hover: {
                enabled: false,
            },
        });
        let anchor = event;
        if (!anchor) {
            // Ensure selection is visible
            this._editor.revealPosition(this._editor.getPosition(), 1 /* ScrollType.Immediate */);
            this._editor.render();
            const cursorCoords = this._editor.getScrolledVisiblePosition(this._editor.getPosition());
            // Translate to absolute editor position
            const editorCoords = dom.getDomNodePagePosition(this._editor.getDomNode());
            const posx = editorCoords.left + cursorCoords.left;
            const posy = editorCoords.top + cursorCoords.top + cursorCoords.height;
            anchor = { x: posx, y: posy };
        }
        const useShadowDOM = this._editor.getOption(132 /* EditorOption.useShadowDOM */) && !isIOS; // Do not use shadow dom on IOS #122035
        // Show menu
        this._contextMenuIsBeingShownCount++;
        this._contextMenuService.showContextMenu({
            domForShadowRoot: useShadowDOM
                ? (this._editor.getOverflowWidgetsDomNode() ?? this._editor.getDomNode())
                : undefined,
            getAnchor: () => anchor,
            getActions: () => actions,
            getActionViewItem: (action) => {
                const keybinding = this._keybindingFor(action);
                if (keybinding) {
                    return new ActionViewItem(action, action, {
                        label: true,
                        keybinding: keybinding.getLabel(),
                        isMenu: true,
                    });
                }
                const customActionViewItem = action;
                if (typeof customActionViewItem.getActionViewItem === 'function') {
                    return customActionViewItem.getActionViewItem();
                }
                return new ActionViewItem(action, action, { icon: true, label: true, isMenu: true });
            },
            getKeyBinding: (action) => {
                return this._keybindingFor(action);
            },
            onHide: (wasCancelled) => {
                this._contextMenuIsBeingShownCount--;
                this._editor.updateOptions({
                    hover: oldHoverSetting,
                });
            },
        });
    }
    _showScrollbarContextMenu(anchor) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (isStandaloneEditorWorkspace(this._workspaceContextService.getWorkspace())) {
            // can't update the configuration properly in the standalone editor
            return;
        }
        const minimapOptions = this._editor.getOption(74 /* EditorOption.minimap */);
        let lastId = 0;
        const createAction = (opts) => {
            return {
                id: `menu-action-${++lastId}`,
                label: opts.label,
                tooltip: '',
                class: undefined,
                enabled: typeof opts.enabled === 'undefined' ? true : opts.enabled,
                checked: opts.checked,
                run: opts.run,
            };
        };
        const createSubmenuAction = (label, actions) => {
            return new SubmenuAction(`menu-action-${++lastId}`, label, actions, undefined);
        };
        const createEnumAction = (label, enabled, configName, configuredValue, options) => {
            if (!enabled) {
                return createAction({ label, enabled, run: () => { } });
            }
            const createRunner = (value) => {
                return () => {
                    this._configurationService.updateValue(configName, value);
                };
            };
            const actions = [];
            for (const option of options) {
                actions.push(createAction({
                    label: option.label,
                    checked: configuredValue === option.value,
                    run: createRunner(option.value),
                }));
            }
            return createSubmenuAction(label, actions);
        };
        const actions = [];
        actions.push(createAction({
            label: nls.localize('context.minimap.minimap', 'Minimap'),
            checked: minimapOptions.enabled,
            run: () => {
                this._configurationService.updateValue(`editor.minimap.enabled`, !minimapOptions.enabled);
            },
        }));
        actions.push(new Separator());
        actions.push(createAction({
            label: nls.localize('context.minimap.renderCharacters', 'Render Characters'),
            enabled: minimapOptions.enabled,
            checked: minimapOptions.renderCharacters,
            run: () => {
                this._configurationService.updateValue(`editor.minimap.renderCharacters`, !minimapOptions.renderCharacters);
            },
        }));
        actions.push(createEnumAction(nls.localize('context.minimap.size', 'Vertical size'), minimapOptions.enabled, 'editor.minimap.size', minimapOptions.size, [
            {
                label: nls.localize('context.minimap.size.proportional', 'Proportional'),
                value: 'proportional',
            },
            {
                label: nls.localize('context.minimap.size.fill', 'Fill'),
                value: 'fill',
            },
            {
                label: nls.localize('context.minimap.size.fit', 'Fit'),
                value: 'fit',
            },
        ]));
        actions.push(createEnumAction(nls.localize('context.minimap.slider', 'Slider'), minimapOptions.enabled, 'editor.minimap.showSlider', minimapOptions.showSlider, [
            {
                label: nls.localize('context.minimap.slider.mouseover', 'Mouse Over'),
                value: 'mouseover',
            },
            {
                label: nls.localize('context.minimap.slider.always', 'Always'),
                value: 'always',
            },
        ]));
        const useShadowDOM = this._editor.getOption(132 /* EditorOption.useShadowDOM */) && !isIOS; // Do not use shadow dom on IOS #122035
        this._contextMenuIsBeingShownCount++;
        this._contextMenuService.showContextMenu({
            domForShadowRoot: useShadowDOM ? this._editor.getDomNode() : undefined,
            getAnchor: () => anchor,
            getActions: () => actions,
            onHide: (wasCancelled) => {
                this._contextMenuIsBeingShownCount--;
                this._editor.focus();
            },
        });
    }
    _keybindingFor(action) {
        return this._keybindingService.lookupKeybinding(action.id);
    }
    dispose() {
        if (this._contextMenuIsBeingShownCount > 0) {
            this._contextViewService.hideContextView();
        }
        this._toDispose.dispose();
    }
};
ContextMenuController = ContextMenuController_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, IContextViewService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IMenuService),
    __param(6, IConfigurationService),
    __param(7, IWorkspaceContextService)
], ContextMenuController);
export { ContextMenuController };
class ShowContextMenu extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.showContextMenu',
            label: nls.localize2('action.showContextMenu.label', 'Show Editor Context Menu'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 1024 /* KeyMod.Shift */ | 68 /* KeyCode.F10 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor) {
        ContextMenuController.get(editor)?.showContextMenu();
    }
}
registerEditorContribution(ContextMenuController.ID, ContextMenuController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(ShowContextMenu);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbnRleHRtZW51L2Jyb3dzZXIvY29udGV4dG1lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFHdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXpGLE9BQU8sRUFBVyxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFHdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCxPQUFPLEVBQ04sWUFBWSxFQUVaLG9CQUFvQixFQUNwQiwwQkFBMEIsR0FFMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUc3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFDTixZQUFZLEVBRVosaUJBQWlCLEdBQ2pCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixtQkFBbUIsR0FDbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDJCQUEyQixHQUMzQixNQUFNLG9EQUFvRCxDQUFBO0FBRXBELElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCOzthQUNWLE9BQUUsR0FBRyw0QkFBNEIsQUFBL0IsQ0FBK0I7SUFFakQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFtQjtRQUNwQyxPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQXdCLHVCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFNRCxZQUNDLE1BQW1CLEVBQ0UsbUJBQXlELEVBQ3pELG1CQUF5RCxFQUMxRCxrQkFBdUQsRUFDdkQsa0JBQXVELEVBQzdELFlBQTJDLEVBQ2xDLHFCQUE2RCxFQUMxRCx3QkFBbUU7UUFOdkQsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUN4Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3pDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDdEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUM1QyxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUNqQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ3pDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFaN0UsZUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDM0Msa0NBQTZCLEdBQVcsQ0FBQyxDQUFBO1FBYWhELElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBRXJCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQW9CLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDNUUsQ0FBQTtRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQW1CLEVBQUUsRUFBRTtZQUNqRCxJQUFJLElBQUksQ0FBQyw2QkFBNkIsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLHFCQUFxQixFQUFFLENBQUE7Z0JBQzdELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxVQUF5QixDQUFBO2dCQUUxQywyQ0FBMkM7Z0JBQzNDLHdFQUF3RTtnQkFDeEUsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO29CQUMzRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxFQUFFLENBQUE7Z0JBQzNDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQWlCLEVBQUUsRUFBRTtZQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLG1DQUEwQixFQUFFLENBQUM7Z0JBQ3ZELE9BQU0sQ0FBQyxtREFBbUQ7WUFDM0QsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLE9BQU8saUNBQXdCLEVBQUUsQ0FBQztnQkFDdkMsNEJBQTRCO2dCQUM1QixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBQ2xCLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtnQkFDbkIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxDQUFvQjtRQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxtQ0FBMEIsRUFBRSxDQUFDO1lBQ3ZELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDcEIsMERBQTBEO1lBQzFELElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDM0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1lBQ0QsT0FBTSxDQUFDLG1EQUFtRDtRQUMzRCxDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksNENBQW1DLEVBQUUsQ0FBQztZQUN0RCxPQUFNLENBQUMseUZBQXlGO1FBQ2pHLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSx5Q0FBaUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNwRixPQUFNLENBQUMscUNBQXFDO1FBQzdDLENBQUM7UUFFRCxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3hCLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUE7UUFFekIsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksdUNBQThCLEVBQUUsQ0FBQztZQUNqRCxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDL0MsQ0FBQztRQUVELElBQ0MsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLHlDQUFpQztZQUM5QyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksMENBQWtDO1lBQy9DLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxxQ0FBNkIsRUFDekMsQ0FBQztZQUNGLE9BQU0sQ0FBQyx3RUFBd0U7UUFDaEYsQ0FBQztRQUVELHVHQUF1RztRQUN2RyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRXBCLDBEQUEwRDtRQUMxRCxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdkIsSUFBSSxzQkFBc0IsR0FBRyxLQUFLLENBQUE7WUFDbEMsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUM7Z0JBQ3RELElBQUksU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDbkQsc0JBQXNCLEdBQUcsSUFBSSxDQUFBO29CQUM3QixNQUFLO2dCQUNOLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDNUMsQ0FBQztRQUNGLENBQUM7UUFFRCx1R0FBdUc7UUFDdkcsSUFBSSxNQUFNLEdBQXVCLElBQUksQ0FBQTtRQUNyQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxxQ0FBNkIsRUFBRSxDQUFDO1lBQ2hELE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO1FBQ2pCLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRU0sZUFBZSxDQUFDLE1BQTJCO1FBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsbUNBQTBCLEVBQUUsQ0FBQztZQUN2RCxPQUFNLENBQUMsbURBQW1EO1FBQzNELENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBRUQsa0NBQWtDO1FBQ2xDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRTdGLHVDQUF1QztRQUN2QyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM3QyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGVBQWUsQ0FBQyxLQUFpQixFQUFFLE1BQWM7UUFDeEQsTUFBTSxNQUFNLEdBQWMsRUFBRSxDQUFBO1FBRTVCLGtCQUFrQjtRQUNsQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQ2hGLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztTQUNkLENBQUMsQ0FBQTtRQUVGLG9DQUFvQztRQUNwQyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzVCLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQTtZQUN6QixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUE7WUFDbEIsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxNQUFNLFlBQVksaUJBQWlCLEVBQUUsQ0FBQztvQkFDekMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDbkUsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUMzQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO3dCQUNuRSxVQUFVLEVBQUUsQ0FBQTtvQkFDYixDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUNuQixVQUFVLEVBQUUsQ0FBQTtnQkFDYixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkIsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBLENBQUMsd0JBQXdCO1FBQ3RDLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxPQUFrQixFQUFFLFFBQTRCLElBQUk7UUFDOUUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFNO1FBQ1AsQ0FBQztRQUVELGdCQUFnQjtRQUNoQixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsNkJBQW9CLENBQUE7UUFDbEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7WUFDMUIsS0FBSyxFQUFFO2dCQUNOLE9BQU8sRUFBRSxLQUFLO2FBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLE1BQU0sR0FBaUMsS0FBSyxDQUFBO1FBQ2hELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLDhCQUE4QjtZQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSwrQkFBdUIsQ0FBQTtZQUU3RSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3JCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO1lBRXhGLHdDQUF3QztZQUN4QyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1lBQzFFLE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQTtZQUNsRCxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQTtZQUV0RSxNQUFNLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUM5QixDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLHFDQUEyQixJQUFJLENBQUMsS0FBSyxDQUFBLENBQUMsdUNBQXVDO1FBRXhILFlBQVk7UUFDWixJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDO1lBQ3hDLGdCQUFnQixFQUFFLFlBQVk7Z0JBQzdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN6RSxDQUFDLENBQUMsU0FBUztZQUVaLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNO1lBRXZCLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPO1lBRXpCLGlCQUFpQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQzdCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzlDLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2hCLE9BQU8sSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRTt3QkFDekMsS0FBSyxFQUFFLElBQUk7d0JBQ1gsVUFBVSxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUU7d0JBQ2pDLE1BQU0sRUFBRSxJQUFJO3FCQUNaLENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUVELE1BQU0sb0JBQW9CLEdBQVEsTUFBTSxDQUFBO2dCQUN4QyxJQUFJLE9BQU8sb0JBQW9CLENBQUMsaUJBQWlCLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQ2xFLE9BQU8sb0JBQW9CLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtnQkFDaEQsQ0FBQztnQkFFRCxPQUFPLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFDckYsQ0FBQztZQUVELGFBQWEsRUFBRSxDQUFDLE1BQU0sRUFBa0MsRUFBRTtnQkFDekQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ25DLENBQUM7WUFFRCxNQUFNLEVBQUUsQ0FBQyxZQUFxQixFQUFFLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO2dCQUNwQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztvQkFDMUIsS0FBSyxFQUFFLGVBQWU7aUJBQ3RCLENBQUMsQ0FBQTtZQUNILENBQUM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8seUJBQXlCLENBQUMsTUFBbUI7UUFDcEQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksMkJBQTJCLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMvRSxtRUFBbUU7WUFDbkUsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsK0JBQXNCLENBQUE7UUFFbkUsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ2QsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUtyQixFQUFXLEVBQUU7WUFDYixPQUFPO2dCQUNOLEVBQUUsRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFO2dCQUM3QixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLE9BQU8sRUFBRSxFQUFFO2dCQUNYLEtBQUssRUFBRSxTQUFTO2dCQUNoQixPQUFPLEVBQUUsT0FBTyxJQUFJLENBQUMsT0FBTyxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTztnQkFDbEUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNyQixHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7YUFDYixDQUFBO1FBQ0YsQ0FBQyxDQUFBO1FBQ0QsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLEtBQWEsRUFBRSxPQUFrQixFQUFpQixFQUFFO1lBQ2hGLE9BQU8sSUFBSSxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0UsQ0FBQyxDQUFBO1FBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxDQUN4QixLQUFhLEVBQ2IsT0FBZ0IsRUFDaEIsVUFBa0IsRUFDbEIsZUFBa0IsRUFDbEIsT0FBc0MsRUFDNUIsRUFBRTtZQUNaLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFPLFlBQVksQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdkQsQ0FBQztZQUNELE1BQU0sWUFBWSxHQUFHLENBQUMsS0FBUSxFQUFFLEVBQUU7Z0JBQ2pDLE9BQU8sR0FBRyxFQUFFO29CQUNYLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUMxRCxDQUFDLENBQUE7WUFDRixDQUFDLENBQUE7WUFDRCxNQUFNLE9BQU8sR0FBYyxFQUFFLENBQUE7WUFDN0IsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsT0FBTyxDQUFDLElBQUksQ0FDWCxZQUFZLENBQUM7b0JBQ1osS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO29CQUNuQixPQUFPLEVBQUUsZUFBZSxLQUFLLE1BQU0sQ0FBQyxLQUFLO29CQUN6QyxHQUFHLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7aUJBQy9CLENBQUMsQ0FDRixDQUFBO1lBQ0YsQ0FBQztZQUNELE9BQU8sbUJBQW1CLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzNDLENBQUMsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQTtRQUM3QixPQUFPLENBQUMsSUFBSSxDQUNYLFlBQVksQ0FBQztZQUNaLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLFNBQVMsQ0FBQztZQUN6RCxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU87WUFDL0IsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDVCxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQzFGLENBQUM7U0FDRCxDQUFDLENBQ0YsQ0FBQTtRQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1FBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQ1gsWUFBWSxDQUFDO1lBQ1osS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0NBQWtDLEVBQUUsbUJBQW1CLENBQUM7WUFDNUUsT0FBTyxFQUFFLGNBQWMsQ0FBQyxPQUFPO1lBQy9CLE9BQU8sRUFBRSxjQUFjLENBQUMsZ0JBQWdCO1lBQ3hDLEdBQUcsRUFBRSxHQUFHLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FDckMsaUNBQWlDLEVBQ2pDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUNoQyxDQUFBO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FDRixDQUFBO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FDWCxnQkFBZ0IsQ0FDZixHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGVBQWUsQ0FBQyxFQUNyRCxjQUFjLENBQUMsT0FBTyxFQUN0QixxQkFBcUIsRUFDckIsY0FBYyxDQUFDLElBQUksRUFDbkI7WUFDQztnQkFDQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxjQUFjLENBQUM7Z0JBQ3hFLEtBQUssRUFBRSxjQUFjO2FBQ3JCO1lBQ0Q7Z0JBQ0MsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsTUFBTSxDQUFDO2dCQUN4RCxLQUFLLEVBQUUsTUFBTTthQUNiO1lBQ0Q7Z0JBQ0MsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxDQUFDO2dCQUN0RCxLQUFLLEVBQUUsS0FBSzthQUNaO1NBQ0QsQ0FDRCxDQUNELENBQUE7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUNYLGdCQUFnQixDQUNmLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsUUFBUSxDQUFDLEVBQ2hELGNBQWMsQ0FBQyxPQUFPLEVBQ3RCLDJCQUEyQixFQUMzQixjQUFjLENBQUMsVUFBVSxFQUN6QjtZQUNDO2dCQUNDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLFlBQVksQ0FBQztnQkFDckUsS0FBSyxFQUFFLFdBQVc7YUFDbEI7WUFDRDtnQkFDQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxRQUFRLENBQUM7Z0JBQzlELEtBQUssRUFBRSxRQUFRO2FBQ2Y7U0FDRCxDQUNELENBQ0QsQ0FBQTtRQUVELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxxQ0FBMkIsSUFBSSxDQUFDLEtBQUssQ0FBQSxDQUFDLHVDQUF1QztRQUN4SCxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDO1lBQ3hDLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUN0RSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTTtZQUN2QixVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTztZQUN6QixNQUFNLEVBQUUsQ0FBQyxZQUFxQixFQUFFLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO2dCQUNwQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3JCLENBQUM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sY0FBYyxDQUFDLE1BQWU7UUFDckMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxJQUFJLENBQUMsNkJBQTZCLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNDLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzFCLENBQUM7O0FBMVlXLHFCQUFxQjtJQWEvQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHdCQUF3QixDQUFBO0dBbkJkLHFCQUFxQixDQTJZakM7O0FBRUQsTUFBTSxlQUFnQixTQUFRLFlBQVk7SUFDekM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsK0JBQStCO1lBQ25DLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLDBCQUEwQixDQUFDO1lBQ2hGLFlBQVksRUFBRSxTQUFTO1lBQ3ZCLE1BQU0sRUFBRTtnQkFDUCxNQUFNLEVBQUUsaUJBQWlCLENBQUMsY0FBYztnQkFDeEMsT0FBTyxFQUFFLDhDQUEwQjtnQkFDbkMsTUFBTSwwQ0FBZ0M7YUFDdEM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDekQscUJBQXFCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLGVBQWUsRUFBRSxDQUFBO0lBQ3JELENBQUM7Q0FDRDtBQUVELDBCQUEwQixDQUN6QixxQkFBcUIsQ0FBQyxFQUFFLEVBQ3hCLHFCQUFxQixpRUFFckIsQ0FBQTtBQUNELG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFBIn0=