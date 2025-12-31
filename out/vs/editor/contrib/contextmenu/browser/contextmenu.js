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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb250ZXh0bWVudS9icm93c2VyL2NvbnRleHRtZW51LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBR3RELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUV6RixPQUFPLEVBQVcsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBR3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFM0QsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBRTFCLE1BQU0sc0NBQXNDLENBQUE7QUFHN0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sWUFBWSxFQUVaLGlCQUFpQixHQUNqQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsbUJBQW1CLEdBQ25CLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLHdCQUF3QixFQUN4QiwyQkFBMkIsR0FDM0IsTUFBTSxvREFBb0QsQ0FBQTtBQUVwRCxJ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